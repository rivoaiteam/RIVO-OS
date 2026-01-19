"""
Supabase Storage service for document uploads.
"""

import os
import uuid
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
BUCKET_NAME = 'documents'


def get_supabase_client() -> Client:
    """Get Supabase client with service role key."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def upload_file(file, folder: str = '') -> dict:
    """
    Upload a file to Supabase Storage.

    Args:
        file: Django InMemoryUploadedFile or similar file object
        folder: Optional folder path (e.g., 'clients/123' or 'cases/456')

    Returns:
        dict with:
            - url: Public URL of the uploaded file
            - path: Storage path
            - file_name: Original file name
            - file_size: File size in bytes
            - file_format: File extension
    """
    supabase = get_supabase_client()

    # Generate unique filename
    file_ext = file.name.split('.')[-1].lower()
    unique_name = f"{uuid.uuid4()}.{file_ext}"

    # Build storage path
    storage_path = f"{folder}/{unique_name}" if folder else unique_name

    # Read file content
    file_content = file.read()

    # Upload to Supabase Storage
    result = supabase.storage.from_(BUCKET_NAME).upload(
        storage_path,
        file_content,
        file_options={
            "content-type": file.content_type or f"application/{file_ext}",
            "upsert": "false"
        }
    )

    # Get public URL
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)

    return {
        'url': public_url,
        'path': storage_path,
        'file_name': file.name,
        'file_size': len(file_content),
        'file_format': file_ext,
    }


def delete_file(path: str) -> bool:
    """
    Delete a file from Supabase Storage.

    Args:
        path: Storage path of the file

    Returns:
        True if deleted successfully
    """
    supabase = get_supabase_client()

    try:
        supabase.storage.from_(BUCKET_NAME).remove([path])
        return True
    except Exception:
        return False
