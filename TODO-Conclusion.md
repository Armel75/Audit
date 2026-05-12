# TODO: Route dédiée PUT /missions/:id/conclusion

✅ **Plan** : Ajouter route sans casser existant

**Step 1: Controller** ✅
- apps/api/src/controllers/missionConclusion.controller.ts
- `updateMissionConclusion(id, conclusion)`

**Step 2: Route** ✅
- apps/api/src/routes/mission.routes.ts
- `router.put('/:id/conclusion', requirePermission('audit_mission:update'), missionConclusionController.updateMissionConclusion)`

**Step 3: Test** ⏳
- PUT /missions/1/conclusion {"conclusion": "test"}

