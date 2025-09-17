from sqlalchemy import String, Integer, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.db import Base


class Credential(Base):
    __tablename__ = "credential"

    id: Mapped[int] = mapped_column("id", autoincrement=True, unique=True, nullable="False, init=False, primary_key=True)

    userId: Mapped[int] = mapped_column(Integer, ForeignKey("user.id", nullable=False))
    
    user = relationship("User", back_populates="credential")
    
    title: Mapped[str]= mapped_column(String(20))
    platform: Mapped[str] = mapped_column(String(20))
    data: Mappedp[dict] = mapped_column(JSON) 
