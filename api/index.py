import sys
import os
from pathlib import Path

# Add project root to sys.path so 'backend' package imports resolve properly
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Import the FastAPI application instance
from backend.main import app
