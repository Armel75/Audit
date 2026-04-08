import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          // This is a simplified Audit Log Middleware
          // In a real scenario, we'd extract the userId from the context (AsyncLocalStorage)
          const resolveTenantId = (value: unknown): number | undefined => {
            if (typeof value === 'number' && Number.isInteger(value)) return value;
            if (
              value &&
              typeof value === 'object' &&
              'set' in value &&
              typeof (value as { set?: unknown }).set === 'number' &&
              Number.isInteger((value as { set?: number }).set)
            ) {
              return (value as { set: number }).set;
            }
            return undefined;
          };

          const tenantIdFromArgs =
            resolveTenantId((args as any)?.data?.tenantId) ??
            resolveTenantId((args as any)?.where?.tenantId) ??
            resolveTenantId((args as any)?.where?.id?.tenantId);

          const result = await query(args);
          const tenantId = resolveTenantId((result as any)?.tenantId) ?? tenantIdFromArgs;

          if (
            ['create', 'update', 'delete'].includes(operation) &&
            model !== 'AuditLog' &&
            typeof tenantId === 'number'
          ) {
            try {
              // Fire and forget audit log creation
              prisma.auditLog
                .create({
                  data: {
                    action: operation.toUpperCase(),
                    tenant: { connect: { id: tenantId } },
                    entityName: model,
                    entityId: String((result as any)?.id ?? 'UNKNOWN'),
                    newValues: operation !== 'delete' ? JSON.stringify(result) : null,
                    // oldValues would require a pre-query fetch in a full implementation
                  },
                })
                .catch(console.error);
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
