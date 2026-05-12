# TODO: Add Edit Finding Functionality (Minimal, No Breaking Changes)

✅ **Step 1: Create FindingEdit.tsx**  
- Wrapper FindingForm pour edit (load data, PUT /findings/:id)  
- Preserve create logic  

⏳ **Step 2: Update FindingForm.tsx**  
- Props: `findingId?: string`  
- If findingId: GET data on mount + PUT else POST  
- No logic change  

✅ **Step 3: Add Edit Button FindingDetails.tsx**  
- Button `finding:update` permission  
- Navigate `/findings/:id/edit`  

⏳ **Step 4: Add Route App.tsx**  
- `<Route path="/findings/:id/edit" element={<FindingEdit />} />`  

⏳ **Step 5: Test**  
- DRAFT finding → Edit → Save → Verify  
- Create unchanged  

*Exact match backend updateFinding, minimal UI only*
