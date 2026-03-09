#!/usr/bin/env python3
"""
Generate a random secret for VIDSTAMP_JWT_SECRET.
Run from the api directory: uv run python generate_jwt_secret.py
"""
import secrets

def main():
    # 32 bytes = 256 bits, URL-safe base64 (no deps beyond stdlib)
    secret = secrets.token_urlsafe(32)
    print("Add this to your Render (or .env) environment:")
    print()
    print("  VIDSTAMP_JWT_SECRET=" + secret)
    print()
    print("Keep this value secret and do not commit it to git.")

if __name__ == "__main__":
    main()
