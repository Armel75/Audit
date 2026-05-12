# TODO: Ajout champ conclusion Mission API

✅ **Plan approuvé** - Mise à jour controller mission

**Step 1: Edit controller** ✅
- apps/api/src/controllers/mission.controller.ts
- Ajouter conclusion dans createMission + updateMission

**Step 2: Generate Prisma** ✅
- cd packages/database
- npx prisma generate (tenté, PowerShell policy - exécuter manuellement si besoin)

**Step 3: Test** ⏳
- Restart API
- POST /missions avec conclusion
- PUT /missions/:id avec conclusion
- Vérifier DB

**Step 4: Completion** ⏳
- Confirmer OK
- Update TODO + attempt_completion

