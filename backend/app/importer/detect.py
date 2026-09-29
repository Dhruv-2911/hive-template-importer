"""What the uploaded bytes really are.

Spectora names its xlsx export `.xls`, so the extension can't be trusted.
"""

from typing import Literal

Container = Literal["xlsx", "legacy-xls", "unknown"]

ZIP_MAGIC = b"PK\x03\x04"
OLE_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"


def detect_container(data: bytes) -> Container:
    if data.startswith(ZIP_MAGIC):
        return "xlsx"
    if data.startswith(OLE_MAGIC):
        return "legacy-xls"
    return "unknown"
