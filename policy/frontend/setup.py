from setuptools import setup, find_packages

setup(
    name="openbot_training_frontend",
    version="0.6.0",
    description="OpenBot model training package",
    url="https://github.com/3dwesupport/OpenBot",
    author="Hardik Garg",
    author_email="hardik.garg@itinker.io",
    license="MIT",
    packages=find_packages(include=["openbot_training_frontend", "openbot_training_frontend.*"]),
    include_package_data=True,
    zip_safe=False,
)
