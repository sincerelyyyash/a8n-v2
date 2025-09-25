"""rename camelCase user columns to snake_case

Revision ID: fix_user_column_names
Revises: 7c44edfa2215
Create Date: 2025-09-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'fix_user_column_names'
down_revision: Union[str, Sequence[str], None] = '7c44edfa2215'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: rename user.firstName->first_name, lastName->last_name if present."""
    op.execute(
        r'''
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'firstName'
    ) THEN
        ALTER TABLE "user" RENAME COLUMN "firstName" TO "first_name";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'lastName'
    ) THEN
        ALTER TABLE "user" RENAME COLUMN "lastName" TO "last_name";
    END IF;
END
$$;
        '''
    )


def downgrade() -> None:
    """Downgrade schema: revert column names back to camelCase if present."""
    op.execute(
        r'''
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE "user" RENAME COLUMN "first_name" TO "firstName";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE "user" RENAME COLUMN "last_name" TO "lastName";
    END IF;
END
$$;
        '''
    )


