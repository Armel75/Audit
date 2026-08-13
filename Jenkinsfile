// =============================================================================
// Jenkinsfile — Pipeline SISAR Audit
// -----------------------------------------------------------------------------
// Exécuté sur le nœud intégré du contrôleur Jenkins (Node 20 + npm + Docker CLI
// fournis par Dockerfile.jenkins). Le daemon Docker utilisé est le service
// Docker-in-Docker "dind" (DOCKER_HOST=tcp://dind:2375).
//
// Étapes : Install → Lint API → Tests unitaires → Build packages →
//          Tests d'intégration (base SQL Server ÉPHÉMÈRE) → Build images Docker
// =============================================================================
pipeline {
  agent any

  environment {
    // Daemon Docker : service dind du docker-compose.jenkins.yml
    DOCKER_HOST = 'tcp://dind:2375'

    // Mot de passe SA de la base de TEST éphémère (jamais la prod).
    // Surchargeable : variable d'env Jenkins ou Credential "audit-test-sa-password".
    SA_PASSWORD = env.AUDIT_TEST_SA_PASSWORD ?: 'DevPassword123!'

    // La base éphémère est exposée sur le conteneur dind → port 14333
    TEST_DATABASE_URL = "sqlserver://sa:${SA_PASSWORD}@dind:14333;database=AuditDB_Test;encrypt=true;trustServerCertificate=true"

    // Variables minimales pour l'import des routes et le bootstrap de test
    JWT_SECRET = 'jenkins-test-jwt-secret'
    JWT_EXPIRES_IN = '2h'
    JWT_REFRESH_EXPIRES_IN = '30d'
    STORAGE_PATH = '.storage'

    // Seed de la base de test (identique à docker-compose.test.yml)
    BOOTSTRAP_ADMIN_EMAIL = 'admin@audit.local'
    BOOTSTRAP_ADMIN_PASSWORD = 'admin123'
    BOOTSTRAP_ADMIN_ROLE = 'SUPER_ADMIN'
    BOOTSTRAP_ADMIN_MATRICULE = 'ADMIN001'
    BOOTSTRAP_TENANT_ID = '1'
    BOOTSTRAP_ADMIN_FIRST_NAME = 'Admin'
    BOOTSTRAP_ADMIN_LAST_NAME = 'System'
    BOOTSTRAP_ADMIN_STATUS = 'ACTIVE'

    // Évite le téléchargement de Chromium/Puppeteer (inutile pour les tests)
    PUPPETEER_SKIP_DOWNLOAD = 'true'
  }

  stages {
    // ── 1. Récupération du code ───────────────────────────────────────────
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    // ── 2. Installation des dépendances ───────────────────────────────────
    stage('Install') {
      steps {
        sh 'npm ci'
        sh 'npm run prisma:generate'
      }
    }

    // ── 3. Qualité : typecheck API ────────────────────────────────────────
    stage('Lint API') {
      steps {
        sh 'cd apps/api && npx tsc --noEmit'
      }
    }

    // ── 4. Tests unitaires (sans base de données) ─────────────────────────
    stage('Tests unitaires') {
      steps {
        sh 'npm run test:unit'
      }
    }

    // ── 5. Build des packages workspace (requis pour les tests d'intégration)
    stage('Build packages') {
      steps {
        sh 'npm run build --workspace=@audit/shared'
        sh 'npm run build --workspace=@audit/database'
        sh 'npm run build --workspace=@audit/api'
      }
    }

    // ── 6. Tests d'intégration sur base SQL Server ÉPHÉMÈRE ───────────────
    stage("Tests d'intégration (DB éphémère)") {
      steps {
        // Démarrer un SQL Server de test jetable (isolé, jamais la prod)
        sh '''
          docker rm -f audit-test-db || true
          docker run -d \
            --name audit-test-db \
            -p 14333:1433 \
            -e ACCEPT_EULA=Y \
            -e MSSQL_SA_PASSWORD="$SA_PASSWORD" \
            -e MSSQL_PID=Developer \
            mcr.microsoft.com/mssql/server:2022-latest
        '''
        // Attendre que SQL Server soit prêt
        sh '''
          for i in $(seq 1 60); do
            if docker exec audit-test-db /opt/mssql-tools18/bin/sqlcmd \
                 -S localhost -U sa -P "$SA_PASSWORD" -C -Q "SELECT 1" >/dev/null 2>&1; then
              echo "✅ SQL Server de test prêt"
              break
            fi
            echo "⏳ Attente SQL Server... $i/60"
            sleep 5
          done
          docker exec audit-test-db /opt/mssql-tools18/bin/sqlcmd \
            -S localhost -U sa -P "$SA_PASSWORD" -C -Q "SELECT 1" || { echo "❌ SQL Server non prêt"; exit 1; }
        '''
        // Créer + migrer + seed la base AuditDB_Test, puis exécuter les tests
        sh "DATABASE_URL='${TEST_DATABASE_URL}' npm run test:setup"
        sh "DATABASE_URL='${TEST_DATABASE_URL}' npm run test:integration"
      }
    }

    // ── 7. Build des images Docker (audit-api, audit-web) ─────────────────
    stage('Build images Docker') {
      steps {
        sh 'docker build -f Dockerfile.api -t audit-api:ci .'
        sh 'docker build -f Dockerfile.web -t audit-web:ci .'
        sh 'docker images audit-api:ci audit-web:ci'
      }
    }
  }

  post {
    // Nettoyage systématique de la base de test éphémère
    always {
      sh 'docker rm -f audit-test-db || true'
    }
  }
}
