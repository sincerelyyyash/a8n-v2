from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.db import Base


class Credential(Base):
    __tablename__ = "credential"

    id: Mapped[int] = mapped_column(
        "id",
        autoincrement=True,
        nullable=False,
        unique=True,
        primary_key=True,
        init=False,
    )

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"))

    user = relationship("User", back_populates="credentials")

    title: Mapped[str] = mapped_column(String(20))
    platform: Mapped[str] = mapped_column(String(20))
    data: Mapped[dict] = mapped_column(JSON)
