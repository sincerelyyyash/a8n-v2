import bcrypt
import jwt
from datetime import datetime, timdelta

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGO = "HS256"

def hash_password(password: str)-> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def create_jwt(user_id: int)-> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(day=1)
    }
    
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_jwt(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithm=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
