# NominacionesDP

Aplicación para las premiaciones del grupo: **nominaciones anónimas → finalistas → votación anónima → revelación animada en la reunión**.

**¿Quién puede ver mi voto? Nadie.** Cada papeleta se cifra en tu celular antes de enviarse, y solo la llave del notario (una persona de confianza que no es el organizador) puede abrirlas, en su propio navegador. El código es público para que cualquiera del grupo pueda auditarlo. La especificación completa y las reglas de anonimato están en [`CLAUDE.md`](CLAUDE.md).

## Desarrollo local

Requisitos: Node 22+ y una base PostgreSQL en [Neon](https://neon.tech) (capa gratuita).

```bash
npm install                 # también genera el cliente de Prisma
cp .env.example .env        # y completa los valores
npm run db:migrate          # crea las tablas en tu base
npm run dev                 # http://localhost:3000
```

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Prisma + PostgreSQL (Neon) · libsodium (cifrado en el navegador) · Vercel.
