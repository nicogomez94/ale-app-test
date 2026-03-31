-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('TRIAL', 'EMPRENDEDOR', 'PROFESIONAL', 'AGENCIA');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVA', 'VENCE_PRONTO', 'VENCIDA');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('INDIVIDUAL', 'EMPRESA');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('ART', 'FLOTAS', 'TRO', 'CONSORCIO', 'INTEGRAL_DE_COMERCIO');

-- CreateEnum
CREATE TYPE "LifePolicyType" AS ENUM ('VIDA', 'RETIRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "avatar" TEXT,
    "matriculaPas" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "plan" "PlanType" NOT NULL DEFAULT 'TRIAL',
    "planVencimiento" TIMESTAMP(3),
    "trialInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialFin" TIMESTAMP(3),
    "estado" "UserStatus" NOT NULL DEFAULT 'ACTIVO',
    "referralCode" TEXT NOT NULL,
    "referidosMes" INTEGER NOT NULL DEFAULT 0,
    "referidosTotales" INTEGER NOT NULL DEFAULT 0,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "direccion" TEXT,
    "cp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "ramo" TEXT,
    "empleados" INTEGER,
    "vehiculos" INTEGER,
    "aseguradora" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT,
    "cp" TEXT,
    "tipo" "CompanyType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clienteId" TEXT,
    "companyId" TEXT,
    "clienteNombre" TEXT NOT NULL,
    "clienteDni" TEXT,
    "clienteTelefono" TEXT,
    "aseguradora" TEXT NOT NULL,
    "rubro" TEXT NOT NULL,
    "numeroPoliza" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "medioPago" TEXT,
    "prima" DOUBLE PRECISION NOT NULL,
    "porcentajeComision" DOUBLE PRECISION NOT NULL,
    "comisionCalculada" DOUBLE PRECISION NOT NULL,
    "estado" "PolicyStatus" NOT NULL DEFAULT 'ACTIVA',
    "tipo" "PolicyType" NOT NULL DEFAULT 'INDIVIDUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifePolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "aseguradora" TEXT NOT NULL,
    "tipo" "LifePolicyType" NOT NULL,
    "sumaAsegurada" DOUBLE PRECISION,
    "prima" DOUBLE PRECISION,
    "aporteMensual" DOUBLE PRECISION,
    "fondoAcumulado" DOUBLE PRECISION,
    "email" TEXT,
    "telefono" TEXT,
    "cp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionClose" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "totalPrima" DOUBLE PRECISION NOT NULL,
    "comisionBruta" DOUBLE PRECISION NOT NULL,
    "crecimiento" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "mpPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "plan" TEXT NOT NULL,
    "metodoPago" TEXT,
    "mpPaymentId" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Company_userId_idx" ON "Company"("userId");

-- CreateIndex
CREATE INDEX "Policy_userId_idx" ON "Policy"("userId");

-- CreateIndex
CREATE INDEX "Policy_estado_idx" ON "Policy"("estado");

-- CreateIndex
CREATE INDEX "Policy_fechaVencimiento_idx" ON "Policy"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "LifePolicy_userId_idx" ON "LifePolicy"("userId");

-- CreateIndex
CREATE INDEX "CommissionClose_userId_idx" ON "CommissionClose"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionClose_userId_mes_anio_key" ON "CommissionClose"("userId", "mes", "anio");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifePolicy" ADD CONSTRAINT "LifePolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionClose" ADD CONSTRAINT "CommissionClose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
