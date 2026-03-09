#!/usr/bin/env python3
"""
Generate bcrypt hashes for VIDSTAMP_ENTRY_PASSWORD_HASH and VIDSTAMP_ADMIN_PASSWORD_HASH.

Run from the api directory (so uv uses this project's deps):
  cd api
  uv run python generate_password_hash.py
  uv run python generate_password_hash.py "yourpassword"
"""
import sys
import bcrypt


def main():
    password = (sys.argv[1] if len(sys.argv) > 1 else "obgyn").encode("utf-8")
    hashed = bcrypt.hashpw(password, bcrypt.gensalt(rounds=12)).decode("utf-8")
    print("Add this to your Render (or .env) environment:")
    print()
    print("  VIDSTAMP_ENTRY_PASSWORD_HASH=" + hashed)
    print("  VIDSTAMP_ADMIN_PASSWORD_HASH=" + hashed)
    print()
    print("(Use the same hash for both if entry and admin share the same password.)")
    print("Generate a different hash for admin by running: python generate_password_hash.py \"adminpassword\"")


if __name__ == "__main__":
    main()
