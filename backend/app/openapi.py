"""Print the API's OpenAPI schema without starting a server or touching a database.

    uv run python -m app.openapi > ../frontend/lib/openapi.json   (run by `npm run gen:api`)
"""

import json

from app.config import Settings
from app.main import create_app

if __name__ == "__main__":
    # The engine is created lazily, so this URL is never connected to.
    app = create_app(Settings(database_url="postgresql://unused@localhost/unused", frontend_dir="/nonexistent"))
    print(json.dumps(app.openapi(), indent=2, sort_keys=True))
