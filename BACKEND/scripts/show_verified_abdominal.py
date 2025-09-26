from app.db.session import SessionLocal
from app.db import models
from sqlalchemy.orm import joinedload

def run():
    db = SessionLocal()
    name='ABDOMINAL DISTENSION'
    rows = (
        db.query(models.Mapping)
        .join(models.ICD11Code)
        .join(models.TraditionalTerm)
        .options(joinedload(models.TraditionalTerm), joinedload(models.ICD11Code))
        .filter(models.ICD11Code.icd_name==name, models.Mapping.status=='verified')
        .all()
    )
    print(f"Verified mappings for '{name}': {len(rows)}")
    for m in rows:
        print({'mapping_id': m.id, 'system': m.traditional_term.system, 'term': m.traditional_term.term, 'code': m.traditional_term.code, 'is_primary': m.is_primary})

if __name__ == '__main__':
    run()
