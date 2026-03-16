import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          // This is a simplified Audit Log Middleware
          // In a real scenario, we'd extract the userId from the context (AsyncLocalStorage)
          const result = await query(args);
          
          if (['create', 'update', 'delete'].includes(operation) && model !== 'AuditLog') {
            try {
              // Fire and forget audit log creation
              prisma.auditLog.create({
                data: {
                  action: operation.toUpperCase(),
                  entityName: model,
                  entityId: (result as any)?.id || 'UNKNOWN',
                  newValues: operation !== 'delete' ? JSON.stringify(result) : null,
                  // oldValues would require a pre-query fetch in a full implementation
                }
              }).catch(console.error);
            } catch (e) {
              console.error('Failed to write audit log', e);
            }
          }
          return result;
        },
      },
    },
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
