---
name: expo-push-notifications
description: Usar cuando se implementen o depuren push notifications en apps Expo/React Native con FCM.
---

# Expo Push Notifications

Patrones y checklist para integrar Expo Push Service + FCM en proyectos Expo.

## Checklist
- Configurar `google-services.json` y credenciales FCM en `app.json` / EAS
- Registrar el push token con `expo-notifications` y guardarlo asociado al usuario/rol
- Separar el envío por rol (mesero, cocina, cliente) usando tópicos o listas de tokens
- Manejar el estado "token inválido" al recibir errores de Expo Push API y limpiarlo

## Errores comunes
- No pedir permisos antes de registrar el token en Android 13+
- No re-registrar el token cuando cambia (reinstalación, logout/login)
