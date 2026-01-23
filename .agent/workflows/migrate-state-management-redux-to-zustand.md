---
description: Simplify state management
---

1. **Install Zustand**:
   // turbo
   - Run `npm install zustand`

2. **Convert Store**:
   ```ts
   import { create } from 'zustand';
   
   export const useStore = create((set) => ({
     count: 0,
     increment: () => set((state) => ({ count: state.count + 1 }))
   }));
   ```

3. **Use in Components**:
   ```tsx
   const count = useStore((state) => state.count);
   const increment = useStore((state) => state.increment);
   ```

4. **Pro Tips**:
   - 10x smaller than Redux.
   - No providers needed.