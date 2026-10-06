import logging
import sys
from typing import Optional


def setup_logger(name: str = "autosar_rag", level: Optional[str] = None) -> logging.Logger:
    """Configures and returns a structured logger with unified engineering format."""
    log_level = getattr(logging, (level or "INFO").upper(), logging.INFO)
    
    logger = logging.getLogger(name)
    logger.setLevel(log_level)

    # Avoid duplicate handlers if logger was already created
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logger()
