gcloud auth login

gcloud config set project openbot-playground-431807

docker build -t openbot-api .

docker tag openbot-api us-central1-docker.pkg.dev/openbot-playground-431807/openbot-playground/openbot-api:latest

docker push us-central1-docker.pkg.dev/openbot-playground-431807/openbot-playground/openbot-api:latest