Global Manifest
- Version : a parti de 0.0.1 => Done
- Version : 8.14.0 || 9.0.1 => Done
- Github : change owner to elastic repo

Piepline
- Utilisation ou non du timestamp, voir si pas redondant avec base-field.yml Date => done

Field
- split base-field vs field => Done

Sample_event.json
Readme.md
-> ajout 
{{ field - bla }} - Mapping
{{ event - bla }} - sample_json

Outil Mito pour le CEL 

Github Issue : https://github.com/elastic/elastic-package/issues/2438
TS de la page où l'on charge le Indicator Name uniquement si les fields associés au type de threat intell sont present : https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/common/threat_intelligence/types/indicator.ts#L22
IndicatorTypeId que l'on va verifier avant d'afficher le threat.indicator.name : https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/common/threat_intelligence/types/indicator.ts#L22

Remove double quote on version manifest