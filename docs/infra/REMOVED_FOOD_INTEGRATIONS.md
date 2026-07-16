# Integrações food removidas

Removidas do código da LavPerform API nesta migração:

| Módulo | Motivo |
|--------|--------|
| Cardápio Web (`cardapioweb`) | Integração food |
| Anota AI (`anotaai`) | Integração food |
| Saipos (`saipos`) | Integração food |
| Accon (`accon`) | Integração food |
| MisterCheff (`mistercheff`) | Integração food |
| Import Brendi | Script food |

## Mantidas (lavanderia)

- VmLav, Cicclo, Maxlav, L2 Automate, Consumer
- Script LaundryKit

## Schema Prisma

O model `DigitalMenuIntegration` **permanece** (store genérico de credenciais também usado pelos partners laundry). Não há migration dropando tabelas — banco ainda pode ser compartilhado com FoodCRM.
