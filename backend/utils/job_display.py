"""Job-number display labels.

An RMA traveler's job number is the combined form "<rma> RMA JOB NO <job>"
(e.g. "1080B RMA JOB NO 8656") — that is the whole number as it is used on the
shop floor and outside NEXUS. `rma_number` and `job_number` stay separate
columns; `job_number` remains the lookup key that barcodes encode and scans
resolve against. Everything user-facing shows the combined label.

Single source of truth — barcodes, labor, search, dashboard and jobs all import
from here so the format can only change in one place.
"""

from models import TravelerType

RMA_TYPES = (TravelerType.RMA_SAME, TravelerType.RMA_DIFF, TravelerType.MODIFICATION)

_MARKER = " RMA JOB NO "


def is_rma(traveler) -> bool:
    """True for the traveler types whose job number carries an RMA number."""
    return getattr(traveler, "traveler_type", None) in RMA_TYPES


def format_job_display(traveler_type, rma_number, job_number) -> str:
    """Combined label from raw column values (for query rows, not ORM objects)."""
    if traveler_type in RMA_TYPES:
        rma = (rma_number or "").strip()
        return f"{rma}{_MARKER}{job_number or ''}".strip()
    return job_number


def rma_job_display(traveler):
    """Combined "<rma> RMA JOB NO <job>" label for an RMA traveler; the plain
    job number for everything else. Returns None for a missing traveler."""
    if traveler is None:
        return None
    return format_job_display(
        getattr(traveler, "traveler_type", None),
        getattr(traveler, "rma_number", None),
        traveler.job_number,
    )


def extract_job_number(scanned: str) -> str:
    """Pull the <job> portion out of a scanned combined RMA label so the
    traveler lookup resolves; pass plain job-number barcodes through."""
    if scanned and _MARKER in scanned:
        return scanned.split(_MARKER, 1)[1].strip()
    return scanned
