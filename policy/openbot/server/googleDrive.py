import requests
import os
import json

folderName = "openBot-Playground"
policyFolderName = "policy"
mime_type = 'application/zip'
accessToken = "123"

def update_shared_variable(value):
    global accessToken
    accessToken = value

def get_shared_variable():
    return accessToken

def get_folder_id(access_token, folder_name,parent_folder_id):
    url = "https://www.googleapis.com/drive/v3/files"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    params = {
        "q": f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        "fields": f"files(id, name)",
        **({"parents": [parent_folder_id]} if parent_folder_id else {})
    }

    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        files = response.json().get("files", [])
        if files:
            print("all files:::",files)
            return files[0]["id"]
    else:
        print("Failed to search for folder. Status code:", response.status_code)
        print("Error details:", response.text)

    return None

def create_folder(access_token, folder_name,parent_folder_id):
    url = "https://www.googleapis.com/drive/v3/files"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    data = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
        **({"parents": [parent_folder_id]} if parent_folder_id else {})
    }

    response = requests.post(url, headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        folder = response.json()
        return folder["id"]
    else:
        print("Failed to create folder. Status code:", response.status_code)
        print("Error details:", response.text)

    return None


def initiate_resumable_upload(file_name, mime_type, folder_id, access_token):
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8"
    }
    metadata = {
        "name": file_name,
        "parents": [folder_id]
    }
    response = requests.post(url, headers=headers, data=json.dumps(metadata))
    if response.status_code == 200:
        upload_url = response.headers['Location']
        return upload_url
    else:
        print("Failed to initiate resumable upload")
        print("Status Code:", response.status_code)
        print("Response Content:", response.content)
        return None

def upload_file_chunks(upload_url, file_path):
    CHUNK_SIZE = 256 * 1024  # 256 KB
    file_size = os.path.getsize(file_path)

    with open(file_path, "rb") as file:
        for start in range(0, file_size, CHUNK_SIZE):
            end = min(start + CHUNK_SIZE, file_size) - 1
            chunk_data = file.read(CHUNK_SIZE)
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}"
            }
            response = requests.put(upload_url, headers=headers, data=chunk_data)
            if response.status_code in [200, 201]:
                print(f"Upload completed for chunk {start}-{end}")
                break
            elif response.status_code == 308:
                print(f"Uploaded chunk {start}-{end}")
            else:
                print("Failed to upload chunk")
                print("Status Code:", response.status_code)
                print("Response Content:", response.content)
                break


async def main(filePath):
    fileName = os.path.basename(filePath)
    print("filePath:::",filePath)
    print("fileName::", fileName)
    folderId = get_folder_id(accessToken,folderName,"")
    if not folderId:
        folderId = create_folder(accessToken, folderName,"")
        print("folder do not exist::",folderId)
        policyFolderId = create_folder(accessToken, policyFolderName,folderId)
        upload_url = initiate_resumable_upload(fileName, mime_type, policyFolderId, accessToken)

    if folderId:
        policyFolderId = get_folder_id(accessToken, policyFolderName,folderId)

        if not policyFolderId:
            policyFolderId = create_folder(accessToken, policyFolderName,folderId)
        print("folder id exista",folderId)
        upload_url = initiate_resumable_upload(fileName, mime_type, policyFolderId, accessToken)


    if upload_url:
        upload_file_chunks(upload_url, filePath)
        print("Upload completed.")
    else:
        print("Failed to initiate resumable upload session.")
