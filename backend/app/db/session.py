"""Database session placeholder.

The prototype currently reads M&E data from the repo ``data/`` folder (see
``app.core.config.Settings.data_dir``). When persistent storage is needed,
wire a real database here (e.g. SQLAlchemy async engine over Postgres/Supabase)
and expose a session dependency for the domain services.

TODO(DfM): implement the engine + ``get_session`` dependency.
"""
