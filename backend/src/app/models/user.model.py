from sqlalchemy import String

from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.db import Base


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(
        "id",
        autoincrement=True,
        nullable=False,
        unique=True,
        primary_key=True,
        init=False,
    )

    first_name: Mapped[str] = mapped_column(String(16))
    last_name: Mapped[str] = mapped_column(String(16))

    email: Mapped[str] = mapped_column(String(25))
    password: Mapped[str] = mapped_column(String(18))

    workflows = relationship("Workflows", back_populates="user")
    credentials = relationship("Credentials", back_populates="user")
