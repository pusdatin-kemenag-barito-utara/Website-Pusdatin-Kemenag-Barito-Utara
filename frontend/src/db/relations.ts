import { relations } from "drizzle-orm";
import { users, satelliteApps, appPermissions, auditLogs } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  appPermissions: many(appPermissions),
}));

export const satelliteAppsRelations = relations(satelliteApps, ({ many }) => ({
  appPermissions: many(appPermissions),
}));

export const appPermissionsRelations = relations(appPermissions, ({ one }) => ({
  user: one(users, {
    fields: [appPermissions.userId],
    references: [users.id],
  }),
  app: one(satelliteApps, {
    fields: [appPermissions.appId],
    references: [satelliteApps.id],
  }),
}));
