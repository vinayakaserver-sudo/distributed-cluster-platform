from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    NODE_NAME: str = "node-1"
    NODE_TYPE: str = "primary_db"
    NODE_HOST: str = "localhost"
    NODE_PORT: int = 8001
    NODE_REGION: str = "local"
    CONTROL_PLANE_URL: str = "http://localhost:8000"
    NODE_ID: str = ""
    API_KEY: str = ""
    HEARTBEAT_INTERVAL: int = 10
    AGENT_VERSION: str = "0.1.0"
    DATA_DIR: str = "./data"
    DATABASE_URL: str = ""
    CACHE_DIR: str = "./cache"

    class Config:
        env_file = ".env"

config = Settings()
