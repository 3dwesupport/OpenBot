//
// Voice Control (Gemini Live)
//

import UIKit

/// Pulsing circle showing the session state: breathing when idle, growing with the mic or speech level.
final class VoiceOrbView: UIView {

    enum State {
        case idle, connecting, listening, thinking, speaking, acting
    }

    var state: State = .idle {
        didSet {
            updateColors()
            updateCore()
        }
    }

    private let ring = CAShapeLayer()
    private let core = CAGradientLayer()
    private let coreMask = CAShapeLayer()
    private var displayLink: CADisplayLink?
    private var breathePhase: CGFloat = 0
    private var displayedLevel: CGFloat = 0
    private var targetLevel: CGFloat = 0

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        backgroundColor = .clear
        isUserInteractionEnabled = false
        core.type = .radial
        core.startPoint = CGPoint(x: 0.5, y: 0.5)
        core.endPoint = CGPoint(x: 1, y: 1)
        core.locations = [0.4, 1]
        core.mask = coreMask
        layer.addSublayer(core)
        ring.fillColor = UIColor.clear.cgColor
        ring.lineWidth = 3
        layer.addSublayer(ring)
        updateColors()
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        displayLink?.invalidate()
        displayLink = nil
        if window != nil {
            let link = CADisplayLink(target: DisplayLinkProxy(self), selector: #selector(DisplayLinkProxy.tick))
            link.add(to: .main, forMode: .common)
            displayLink = link
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        core.frame = bounds
        ring.frame = bounds
        ring.path = UIBezierPath(ovalIn: bounds.insetBy(dx: ring.lineWidth, dy: ring.lineWidth)).cgPath
        updateCore()
    }

    /// Animates toward a 0...1 level.
    func setLevel(_ level: Float) {
        targetLevel = CGFloat(max(0, min(1, level)))
    }

    fileprivate func tick() {
        // One breathe cycle (in and out) is about 5 s.
        breathePhase += 1.0 / (60 * 2.6)
        displayedLevel += (targetLevel - displayedLevel) * 0.25
        updateCore()
    }

    private func updateCore() {
        let maxRadius = min(bounds.width, bounds.height) / 2 - ring.lineWidth
        guard maxRadius > 0 else {
            return
        }
        let breathe = 0.04 * sin(breathePhase * .pi)
        let radius: CGFloat
        if state == .idle || state == .connecting {
            radius = maxRadius * (0.55 + breathe)
        } else {
            radius = maxRadius * (0.55 + displayedLevel * 0.4)
        }
        let center = CGPoint(x: bounds.midX, y: bounds.midY)
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        coreMask.path = UIBezierPath(arcCenter: center, radius: radius, startAngle: 0, endAngle: 2 * .pi, clockwise: true).cgPath
        CATransaction.commit()
    }

    private func updateColors() {
        let color = VoiceOrbView.color(for: state)
        core.colors = [color.cgColor, color.withAlphaComponent(0.55).cgColor]
        ring.strokeColor = color.withAlphaComponent(0.35).cgColor
    }

    static func color(for state: State) -> UIColor {
        switch state {
        case .listening: return UIColor(red: 0x93 / 255.0, green: 0xC4 / 255.0, blue: 0x7D / 255.0, alpha: 1)
        case .thinking: return UIColor(red: 0x72 / 255.0, green: 0x68 / 255.0, blue: 0xA6 / 255.0, alpha: 1)
        case .acting: return UIColor(red: 0xFF / 255.0, green: 0xAB / 255.0, blue: 0x00 / 255.0, alpha: 1)
        case .connecting: return UIColor(red: 0x98 / 255.0, green: 0x99 / 255.0, blue: 0x9B / 255.0, alpha: 1)
        case .speaking, .idle: return Colors.voiceControlColor
        }
    }
}

/// Keeps CADisplayLink from retaining the orb.
private final class DisplayLinkProxy {
    weak var orb: VoiceOrbView?

    init(_ orb: VoiceOrbView) {
        self.orb = orb
    }

    @objc func tick(_ link: CADisplayLink) {
        guard let orb = orb else {
            link.invalidate()
            return
        }
        orb.tick()
    }
}

/// One line of the conversation transcript.
final class VoiceChatMessage {
    enum Role {
        case user, model, action
    }

    let role: Role
    var text: String

    init(role: Role, text: String) {
        self.role = role
        self.text = text
    }
}

/// Chat bubble: user on the right, robot on the left, actions centered.
final class VoiceChatCell: UITableViewCell {
    static let identifier = "VoiceChatCell"

    private let bubble = UIView()
    private let label = UILabel()
    private var leading: NSLayoutConstraint!
    private var trailing: NSLayoutConstraint!
    private var centerX: NSLayoutConstraint!

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = .clear
        selectionStyle = .none
        bubble.layer.cornerRadius = 14
        bubble.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(bubble)
        label.numberOfLines = 0
        label.font = UIFont.systemFont(ofSize: 15)
        label.translatesAutoresizingMaskIntoConstraints = false
        bubble.addSubview(label)
        leading = bubble.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8)
        trailing = bubble.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8)
        centerX = bubble.centerXAnchor.constraint(equalTo: contentView.centerXAnchor)
        NSLayoutConstraint.activate([
            bubble.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 4),
            bubble.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -4),
            bubble.widthAnchor.constraint(lessThanOrEqualTo: contentView.widthAnchor, multiplier: 0.85),
            label.topAnchor.constraint(equalTo: bubble.topAnchor, constant: 8),
            label.bottomAnchor.constraint(equalTo: bubble.bottomAnchor, constant: -8),
            label.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 12),
            label.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -12),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(with message: VoiceChatMessage) {
        label.text = message.text
        leading.isActive = false
        trailing.isActive = false
        centerX.isActive = false
        switch message.role {
        case .user:
            trailing.isActive = true
            bubble.backgroundColor = Colors.voiceControlColor
            label.textColor = .white
            label.font = UIFont.systemFont(ofSize: 15)
        case .model:
            leading.isActive = true
            bubble.backgroundColor = UIColor.secondarySystemBackground
            label.textColor = .label
            label.font = UIFont.systemFont(ofSize: 15)
        case .action:
            centerX.isActive = true
            bubble.backgroundColor = VoiceOrbView.color(for: .acting).withAlphaComponent(0.25)
            label.textColor = .label
            label.font = UIFont.italicSystemFont(ofSize: 14)
        }
    }
}

extension UITextField {
    /// For API keys: no autocorrect, smart punctuation or spell check, so the pasted key is kept as is.
    func configureForApiKey() {
        autocapitalizationType = .none
        autocorrectionType = .no
        spellCheckingType = .no
        smartDashesType = .no
        smartQuotesType = .no
        smartInsertDeleteType = .no
        keyboardType = .asciiCapable
    }
}
