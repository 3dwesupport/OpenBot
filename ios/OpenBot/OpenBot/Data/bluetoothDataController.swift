//
// Created by Nitish Yadav on 29/08/22.
//

import Foundation
import CoreBluetooth
import CoreMotion

class bluetoothDataController: CMDeviceMotion, CBCentralManagerDelegate, CBPeripheralDelegate {
    static let shared: bluetoothDataController = bluetoothDataController()
    var centralManager: CBCentralManager?
    var peri: CBPeripheral?
    var peripherals = Array<CBPeripheral>()
    var tempPeripheral: CBPeripheral!
    var sonarData: String = ""
    var voltageDivider: String = ""
    var speedometer: String = ""
    private var allServices: [CBService]?
    var writeCharacteristics: CBCharacteristic?

    required init?(coder: NSCoder) {
        super.init()
        fatalError("init(coder:) has not been implemented")
    }

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
        NotificationCenter.default.addObserver(self,
                selector: #selector(startNotification),
                name: Notification.Name("updateLabel"),
                object: nil)

        NotificationCenter.default.addObserver(self,
                selector: #selector(startNotification),
                name: Notification.Name("updateSerialMonitor"),
                object: nil)

    }


    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if (central.state == .poweredOn) {
            centralManager?.scanForPeripherals(withServices: nil, options: nil)
        } else {
            // do something like alert the user that ble is not on
        }

    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        if peripheral.name != nil {
            peripherals.append(peripheral)
        }

    }


    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("connected to", peripheral)
        isBluetoothConnected = true;
        peripheral.discoverServices(nil)

    }


    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("connection was failed")

    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        print("disconnected from :", peripheral)
        isBluetoothConnected = false

    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let services = peripheral.services {
            for service in services {
                allServices?.append(service)
                peripheral.discoverCharacteristics([], for: service)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverDescriptorsFor characteristic: CBCharacteristic, error: Error?) {
        if let des = characteristic.descriptors {
            for d in des {
                peripheral.readValue(for: d)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let characteristics = service.characteristics {
            for characteristic in characteristics {
                writeCharacteristics = characteristic
                subscribeToNotifications(peripheral: tempPeripheral, characteristic: characteristic)
                readValue(characteristic: characteristic)

                peripheral.discoverDescriptors(for: characteristic)
            }
        }
    }

    func subscribeToNotifications(peripheral: CBPeripheral, characteristic: CBCharacteristic) {
        peripheral.setNotifyValue(true, for: characteristic)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        if error != nil {
            return
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        print("Data sent to :", peripheral.name as Any);

    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor descriptor: CBDescriptor, error: Error?) {
        _ = descriptor.value

    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if characteristic.value != nil {
            let data = characteristic.value!
            let x = String(data: data, encoding: .utf8) ?? ""
            bluetoothData = x
            NotificationCenter.default.post(name: .updateSerialMonitor, object: nil)
            NotificationCenter.default.post(name: .updateLabel, object: nil)
            if x.prefix(1) == "s" {
                sonarData = x
            } else if x.prefix(1) == "v" {
                voltageDivider = x
            } else if x.prefix(1) == "w" {
                speedometer = x
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didModifyServices invalidatedServices: [CBService]) {
        print(invalidatedServices)
    }

    func readValue(characteristic: CBCharacteristic) {
        tempPeripheral?.readValue(for: characteristic)
    }

    func sendData(payload: String) {
        let dataToSend: Data? = payload.data(using: String.Encoding.utf8)
        if (dataToSend != nil && tempPeripheral != nil) {
            tempPeripheral!.writeValue(dataToSend!, for: writeCharacteristics!, type: CBCharacteristicWriteType.withResponse)
        }
    }

    func disconnect() {
        centralManager?.cancelPeripheralConnection(tempPeripheral)
        startScan()
        peri = nil
    }

    func connect() {
        centralManager?.stopScan()
        tempPeripheral = peri
        tempPeripheral.delegate = self
        centralManager?.connect(tempPeripheral)

    }



    func startScan(){
    }

    @objc func startNotification() {

    }
    }



extension Notification.Name {
    static let updateLabel = Notification.Name("updateLabel")
    static let updateSerialMonitor = Notification.Name("updateSerialMonitor")
}