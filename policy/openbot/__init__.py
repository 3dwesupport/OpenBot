import os


def mkdir(path):
    if not (os.path.exists(path)):
        os.makedirs(path)


base_dir = os.path.dirname(os.path.dirname(__file__))
dataset_dir = os.path.join(base_dir, "dataset")
models_dir = os.path.join(base_dir, "models")


mkdir(models_dir)