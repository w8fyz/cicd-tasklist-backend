pipeline {
    agent any

    tools {
        nodejs 'NodeJS_22'
    }

    environment {
        IMAGE_NAME = 'thibeau-tasklist-backend'
        IMAGE_TAG  = "${env.BUILD_NUMBER}"
    }

    options {
        timestamps()
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

        stage('Qualite de code') {
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

        stage('Analyse de securite') {
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
                    credentialsId: 'dockerhub',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'docker build -t "$DOCKER_USER/$IMAGE_NAME:$IMAGE_TAG" -t "$DOCKER_USER/$IMAGE_NAME:latest" .'
                }
            }
        }

        stage('Publication Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub',
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
