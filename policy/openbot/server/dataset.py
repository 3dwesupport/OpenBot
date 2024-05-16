import glob
import os
import traceback

from .. import associate_frames, dataset_dir


def get_dataset_list(dir_path , id):
    print("id in get_dataset_list::",id)
    print("dir_path, name::",dir_path, dataset_dir)
    print("get_dataset_info::",get_dataset_info)
    for name in listdir(dataset_dir, dir_path):
        print("name::",name)
    print("get_dataset_list::",[get_dataset_info(dir_path, name, id) for name in listdir(dataset_dir, dir_path)])
    return [get_dataset_info(dir_path, name, id) for name in listdir(dataset_dir, dir_path)]


def get_dataset_info(dir_path, name, id):
    file_list = get_dir_info(os.path.join(dir_path, name) , id)
    return dict(
        name=name,
        path="/" + dir_path + "/" + name,
        sessions=list(filter(lambda f: f["is_session"], file_list)),
    )


def get_dir_info(dir_path , id):
    files = []
    list1 = listdir(dataset_dir, dir_path)
    print("list1:::",list1)
    for basename in list1:
        info = get_info(dir_path, basename)
        if info and basename.endswith(id):
            files.append(info)

#     filtered_items = [files for item in files if item['path'].endswith(id)]
#     print("files:::",filtered_items)
    return files


def listdir(*parts):
    list1 = [d for d in os.listdir(os.path.join(*parts)) if ".DS_Store" not in d]
    list1.sort()
    return list1


def get_info(path, basename=None):
    path = path.lstrip("/")
    print("get_info path::",path , basename)
    if basename:
        path = os.path.join(path, basename)
    else:
        basename = os.path.basename(path)
    real_path = dataset_dir + "/" + path
    if not os.path.isdir(real_path):
        return None

    is_session = os.path.isdir(real_path + "/images")
    if is_session:
        try:
            max_offset = 1e3
            frames = associate_frames.match_frame_session(
                real_path,
                max_offset,
                redo_matching=False,
                remove_zeros=True,
            )
            keys = list(frames.keys())
            seconds = int((keys[-1] - keys[0]) / 1000 / 1000 / 1000)
            ctrl = []
            for key in frames:
                frame = frames[key]
                frame[0] = os.path.basename(frame[0])
                ctrl.append(frame)
            error = None
        except Exception as e:
            traceback.print_exc()
            seconds = 0
            ctrl = []
            error = str(e)

        return {
            "path": "/" + path,
            "name": basename,
            "is_session": is_session,
            "ctrl": ctrl,
            "seconds": seconds,
            "error": error,
        }

    files = os.listdir(real_path)
    file_count = len(files)
    dirs = glob.glob(real_path + "/*/")
    dir_count = len(dirs)

    return {
        "path": "/" + path,
        "name": basename,
        "is_session": is_session,
        "files": file_count - dir_count,
        "dirs": dir_count,
    }


def redoMatching(path):
    max_offset = 1e3
    associate_frames.match_frame_session(dataset_dir + path, max_offset, True, True)
    return True


def count_lines(path):
    try:
        i = 0
        with open(path) as f:
            for i, l in enumerate(f):
                pass
        return i + 1
    except FileNotFoundError:
        return 0
