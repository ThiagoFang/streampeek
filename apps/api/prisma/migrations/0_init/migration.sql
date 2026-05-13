-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_login" TEXT NOT NULL,
    "user_display_name" TEXT NOT NULL,
    "profile_image_url" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_exclusions" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "broadcaster_id" TEXT NOT NULL,
    "broadcaster_login" TEXT NOT NULL,
    "broadcaster_name" TEXT NOT NULL,

    CONSTRAINT "notification_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_session_id_key" ON "auth_tokens"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_user_id_key" ON "auth_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_exclusions_user_id_broadcaster_id_key" ON "notification_exclusions"("user_id", "broadcaster_id");
