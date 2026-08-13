-- =============================================================================
-- SISAR Audit — Initialisation de la base de données SQL Server
-- Ce script crée la base 'AuditDB' si elle n'existe pas.
-- Les tables sont créées via les migrations Prisma au démarrage de l'API.
-- =============================================================================

-- Créer la base de données si elle n'existe pas déjà
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AuditDB')
BEGIN
    CREATE DATABASE [AuditDB];
    PRINT '✅ Base de données AuditDB créée avec succès.';
END
ELSE
BEGIN
    PRINT 'ℹ️  La base de données AuditDB existe déjà.';
END
GO

USE [AuditDB];
GO

-- Vérifier que la base est bien accessible
IF DB_ID('AuditDB') IS NOT NULL
    PRINT '✅ AuditDB est accessible et prête.';
ELSE
    THROW 50000, '❌ AuditDB inaccessible !', 1;
GO
