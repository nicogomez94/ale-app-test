-- CreateEnum
CREATE TYPE "CommissionInvoiceStatus" AS ENUM ('PENDIENTE', 'FACTURADA', 'COBRADA', 'PARCIAL', 'VENCIDA');

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN "renewalGeneratedAt" TIMESTAMP(3);
ALTER TABLE "Policy" ADD COLUMN "renewalGroupId" TEXT;

-- CreateTable
CREATE TABLE "InsuranceCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "domicilioComercial" TEXT,
    "ivaCondition" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "websiteUrl" TEXT,
    "portalUsername" TEXT,
    "portalPasswordEncrypted" TEXT,
    "producerCode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "contactoNombre" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerInsuranceCompany" (
    "brokerId" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerInsuranceCompany_pkey" PRIMARY KEY ("brokerId","insuranceCompanyId")
);

-- CreateTable
CREATE TABLE "CommissionInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insuranceCompanyId" TEXT,
    "periodo" TEXT NOT NULL,
    "numeroFactura" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "estado" "CommissionInvoiceStatus" NOT NULL DEFAULT 'PENDIENTE',
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" "CurrencyType" NOT NULL DEFAULT 'ARS',
    "comprobanteUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionInvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "medioPago" TEXT,
    "comprobanteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionInvoicePolicy" (
    "invoiceId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionInvoicePolicy_pkey" PRIMARY KEY ("invoiceId","policyId")
);

-- CreateIndex
CREATE INDEX "Policy_groupId_idx" ON "Policy"("groupId");

-- CreateIndex
CREATE INDEX "InsuranceCompany_userId_idx" ON "InsuranceCompany"("userId");

-- CreateIndex
CREATE INDEX "InsuranceCompany_cuit_idx" ON "InsuranceCompany"("cuit");

-- CreateIndex
CREATE INDEX "Broker_userId_idx" ON "Broker"("userId");

-- CreateIndex
CREATE INDEX "BrokerInsuranceCompany_insuranceCompanyId_idx" ON "BrokerInsuranceCompany"("insuranceCompanyId");

-- CreateIndex
CREATE INDEX "CommissionInvoice_userId_idx" ON "CommissionInvoice"("userId");

-- CreateIndex
CREATE INDEX "CommissionInvoice_insuranceCompanyId_idx" ON "CommissionInvoice"("insuranceCompanyId");

-- CreateIndex
CREATE INDEX "CommissionInvoice_periodo_idx" ON "CommissionInvoice"("periodo");

-- CreateIndex
CREATE INDEX "CommissionInvoice_estado_idx" ON "CommissionInvoice"("estado");

-- CreateIndex
CREATE INDEX "CommissionInvoicePayment_invoiceId_idx" ON "CommissionInvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "CommissionInvoicePolicy_policyId_idx" ON "CommissionInvoicePolicy"("policyId");

-- AddForeignKey
ALTER TABLE "InsuranceCompany" ADD CONSTRAINT "InsuranceCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broker" ADD CONSTRAINT "Broker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerInsuranceCompany" ADD CONSTRAINT "BrokerInsuranceCompany_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerInsuranceCompany" ADD CONSTRAINT "BrokerInsuranceCompany_insuranceCompanyId_fkey" FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInvoice" ADD CONSTRAINT "CommissionInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInvoice" ADD CONSTRAINT "CommissionInvoice_insuranceCompanyId_fkey" FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInvoicePayment" ADD CONSTRAINT "CommissionInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CommissionInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInvoicePolicy" ADD CONSTRAINT "CommissionInvoicePolicy_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CommissionInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInvoicePolicy" ADD CONSTRAINT "CommissionInvoicePolicy_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
