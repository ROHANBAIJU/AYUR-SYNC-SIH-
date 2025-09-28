import sys, os
# Ensure project root (BACKEND) parent is on path so 'app' package can be imported when running from BACKEND directory
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
if root not in sys.path:
    sys.path.insert(0, root)
