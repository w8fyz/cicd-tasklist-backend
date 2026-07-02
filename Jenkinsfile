pipeline {
    agent any

    environment {
        IMAGE_NAME = 'thibeau-tasklist-backend'
        IMAGE_TAG  = "${env.BUILD_NUMBER}"
        DOCKER_CREDENTIALS = 'thibeau-dockerhub'
    }

    triggers {
        githubPush()
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Installation des dependances') {
            steps {
                sh 'npm ci'
                sh 'npx prisma generate'
            }
        }

        stage('Qualite de code - TypeScript') {
            steps {
                sh 'npx tsc --noEmit'
            }
        }

        stage('Tests unitaires') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                    archiveArtifacts artifacts: 'coverage/lcov.info', allowEmptyArchive: true
                }
            }
        }

        stage('Qualite de code - SonarQube') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        npx sonarqube-scanner \
                            -Dsonar.host.url=https://sonarqube.cicd.kits.ext.educentre.fr \
                            -Dsonar.token=${SONAR_TOKEN} \
                            -Dsonar.projectKey=thibeau-tasklist-backend \
                            -Dsonar.projectName=Thibeau-TaskList-Backend \
                            -Dsonar.sources=src \
                            -Dsonar.exclusions=src/__tests__/**,**/*.test.ts \
                            -Dsonar.tests=src/__tests__ \
                            -Dsonar.test.inclusions=**/*.test.ts \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    '''
                }
            }
        }

        stage('Analyse de securite - npm audit') {
            steps {
                sh 'npm audit --audit-level=high'
            }
        }

        stage('Build du livrable') {
            steps {
                sh 'npm run build'
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Construction image Docker') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_CREDENTIALS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'docker build -t "$DOCKER_USER/$IMAGE_NAME:$IMAGE_TAG" -t "$DOCKER_USER/$IMAGE_NAME:latest" .'
                }
            }
        }

        stage('Analyse de securite - Trivy') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_CREDENTIALS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        trivy image --exit-code 0 --severity HIGH,CRITICAL \
                            --format table --scanners vuln \
                            "$DOCKER_USER/$IMAGE_NAME:$IMAGE_TAG"
                        trivy image --format json --output trivy-report.json \
                            --scanners vuln "$DOCKER_USER/$IMAGE_NAME:$IMAGE_TAG"
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Publication Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_CREDENTIALS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh 'docker push "$DOCKER_USER/$IMAGE_NAME:$IMAGE_TAG"'
                    sh 'docker push "$DOCKER_USER/$IMAGE_NAME:latest"'
                }
            }
            post {
                always {
                    sh 'docker logout'
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline backend termine avec succes - image ${IMAGE_NAME}:${IMAGE_TAG} publiee sur Docker Hub"
        }
        failure {
            echo 'Pipeline backend en echec - consulter les logs ci-dessus'
        }
        always {
            cleanWs()
        }
    }
}
