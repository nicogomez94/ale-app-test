import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("123456", 12);

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "alejandro.rh.diaz@gmail.com" },
    update: {
      password: hashedPassword,
      nombre: "Alejandro Díaz",
      telefono: "11 2233-4455",
      direccion: "Av. Corrientes 1234, CABA",
      matriculaPas: "12345",
      isAdmin: true,
    },
    create: {
      email: "alejandro.rh.diaz@gmail.com",
      password: hashedPassword,
      nombre: "Alejandro Díaz",
      telefono: "11 2233-4455",
      direccion: "Av. Corrientes 1234, CABA",
      matriculaPas: "12345",
      isAdmin: true,
      plan: "TRIAL",
      trialInicio: new Date(),
      trialFin: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      planVencimiento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      referralCode: "PAS-ALEJANDRO-2024",
      referidosMes: 2,
      referidosTotales: 14,
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "Juan Pérez",
        dni: "30123456",
        telefono: "1122334455",
        email: "juan@example.com",
        direccion: "Av. Corrientes 1234",
        cp: "1000",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "María García",
        dni: "25987654",
        telefono: "1199887766",
        email: "maria@example.com",
        direccion: "Calle Falsa 123",
        cp: "2000",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "Carlos López",
        dni: "35112233",
        telefono: "1155443322",
        email: "carlos@example.com",
        direccion: "Rivadavia 500",
        cp: "3000",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "Ana Martínez",
        dni: "28654321",
        telefono: "1144556677",
        email: "ana@example.com",
        direccion: "San Martín 800",
        cp: "1004",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "Pedro Sánchez",
        dni: "33445566",
        telefono: "1166778899",
        email: "pedro@example.com",
        direccion: "Belgrano 200",
        cp: "1010",
      },
    }),
  ]);

  console.log(`Created ${clients.length} clients`);

  // Create companies
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Tech Solutions S.A.",
        cuit: "30-12345678-9",
        empleados: 45,
        aseguradora: "Prevención ART",
        email: "rrhh@techsolutions.com",
        telefono: "1144556677",
        direccion: "Av. Libertador 1000",
        cp: "1425",
        ramo: "Tecnología",
        tipo: "ART",
      },
    }),
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Logística Express",
        cuit: "30-98765432-1",
        empleados: 120,
        aseguradora: "Experta ART",
        email: "info@logistica.com",
        telefono: "1122334455",
        direccion: "Ruta 8 Km 50",
        cp: "1629",
        ramo: "Transporte",
        tipo: "ART",
      },
    }),
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Distribuidora Norte",
        cuit: "30-11223344-5",
        vehiculos: 12,
        aseguradora: "Sancor Seguros",
        email: "flota@distnorte.com",
        telefono: "1155667788",
        direccion: "Pueyrredón 450",
        cp: "1032",
        ramo: "Distribución",
        tipo: "FLOTAS",
      },
    }),
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Fábrica Textil S.R.L.",
        cuit: "30-55667788-2",
        aseguradora: "Allianz",
        email: "ventas@textil.com",
        telefono: "1166778899",
        direccion: "Warnes 1200",
        cp: "1414",
        ramo: "Textil",
        tipo: "TRO",
      },
    }),
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Edificio Sol Naciente",
        cuit: "30-99887766-4",
        aseguradora: "Sancor Seguros",
        email: "admin@solnaciente.com",
        telefono: "1133445566",
        direccion: "Av. Santa Fe 2500",
        cp: "1425",
        ramo: "Inmobiliario",
        tipo: "CONSORCIO",
      },
    }),
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Supermercado Don Juan",
        cuit: "30-22334455-1",
        aseguradora: "La Segunda",
        email: "donjuan@gmail.com",
        telefono: "1177889900",
        direccion: "Belgrano 300",
        cp: "1001",
        ramo: "Retail",
        tipo: "INTEGRAL_DE_COMERCIO",
      },
    }),
  ]);

  console.log(`Created ${companies.length} companies`);

  // Create individual policies
  const now = new Date();
  const policies = await Promise.all([
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[0].id,
        clienteNombre: "Juan Pérez",
        clienteDni: "30123456",
        clienteTelefono: "1122334455",
        aseguradora: "Sancor Seguros",
        rubro: "Automotor",
        numeroPoliza: "4452",
        fechaInicio: new Date("2025-03-01"),
        fechaVencimiento: new Date("2026-03-01"),
        medioPago: "Tarjeta de crédito",
        prima: 15000,
        porcentajeComision: 15,
        comisionCalculada: 2250,
        estado: "VENCIDA",
        tipo: "INDIVIDUAL",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[1].id,
        clienteNombre: "María García",
        clienteDni: "25987654",
        clienteTelefono: "1199887766",
        aseguradora: "Federación Patronal",
        rubro: "Hogar",
        numeroPoliza: "9921",
        fechaInicio: new Date("2025-04-05"),
        fechaVencimiento: new Date("2026-04-05"),
        medioPago: "Transferencia",
        prima: 8000,
        porcentajeComision: 12,
        comisionCalculada: 960,
        estado: "ACTIVA",
        tipo: "INDIVIDUAL",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[2].id,
        clienteNombre: "Carlos López",
        clienteDni: "35112233",
        clienteTelefono: "1155443322",
        aseguradora: "La Segunda",
        rubro: "Moto",
        numeroPoliza: "1122",
        fechaInicio: new Date("2025-04-15"),
        fechaVencimiento: new Date("2026-04-15"),
        medioPago: "Tarjeta de débito",
        prima: 6000,
        porcentajeComision: 10,
        comisionCalculada: 600,
        estado: "ACTIVA",
        tipo: "INDIVIDUAL",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[3].id,
        clienteNombre: "Ana Martínez",
        clienteDni: "28654321",
        clienteTelefono: "1144556677",
        aseguradora: "Zurich",
        rubro: "Automotor",
        numeroPoliza: "8877",
        fechaInicio: new Date("2025-04-04"),
        fechaVencimiento: new Date("2026-04-04"),
        medioPago: "Tarjeta de crédito",
        prima: 12000,
        porcentajeComision: 15,
        comisionCalculada: 1800,
        estado: "ACTIVA",
        tipo: "INDIVIDUAL",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[4].id,
        clienteNombre: "Pedro Sánchez",
        clienteDni: "33445566",
        clienteTelefono: "1166778899",
        aseguradora: "Mercantil Andina",
        rubro: "Celular / Electrónica",
        numeroPoliza: "3344",
        fechaInicio: new Date("2025-02-28"),
        fechaVencimiento: new Date("2026-02-28"),
        medioPago: "Transferencia",
        prima: 3000,
        porcentajeComision: 8,
        comisionCalculada: 240,
        estado: "VENCIDA",
        tipo: "INDIVIDUAL",
      },
    }),
  ]);

  // Create company policies
  await Promise.all([
    prisma.policy.create({
      data: {
        userId: user.id,
        companyId: companies[0].id,
        clienteNombre: "Tech Solutions S.A.",
        aseguradora: "Prevención ART",
        rubro: "ART",
        numeroPoliza: "ART-101",
        fechaInicio: new Date("2025-04-03"),
        fechaVencimiento: new Date("2026-04-03"),
        medioPago: "Transferencia",
        prima: 50000,
        porcentajeComision: 10,
        comisionCalculada: 5000,
        estado: "ACTIVA",
        tipo: "EMPRESA",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        companyId: companies[1].id,
        clienteNombre: "Logística Express",
        aseguradora: "Experta ART",
        rubro: "ART",
        numeroPoliza: "ART-202",
        fechaInicio: new Date("2025-04-07"),
        fechaVencimiento: new Date("2026-04-07"),
        medioPago: "Tarjeta de crédito",
        prima: 80000,
        porcentajeComision: 10,
        comisionCalculada: 8000,
        estado: "ACTIVA",
        tipo: "EMPRESA",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        companyId: companies[4].id,
        clienteNombre: "Edificio Sol Naciente",
        aseguradora: "Sancor Seguros",
        rubro: "Consorcio",
        numeroPoliza: "CON-505",
        fechaInicio: new Date("2025-04-02"),
        fechaVencimiento: new Date("2026-04-02"),
        medioPago: "Transferencia",
        prima: 25000,
        porcentajeComision: 12,
        comisionCalculada: 3000,
        estado: "ACTIVA",
        tipo: "EMPRESA",
      },
    }),
  ]);

  console.log(`Created ${policies.length + 3} policies`);

  // Create life policies
  await Promise.all([
    prisma.lifePolicy.create({
      data: {
        userId: user.id,
        cliente: "Juan Pérez",
        cuit: "20-12345678-9",
        aseguradora: "Zurich",
        tipo: "VIDA",
        sumaAsegurada: 5000000,
        prima: 1500,
        email: "juan.perez@gmail.com",
        telefono: "1144556677",
        cp: "1425",
      },
    }),
    prisma.lifePolicy.create({
      data: {
        userId: user.id,
        cliente: "María García",
        cuit: "27-98765432-1",
        aseguradora: "Sancor Seguros",
        tipo: "RETIRO",
        aporteMensual: 2500,
        fondoAcumulado: 450000,
        email: "m.garcia@outlook.com",
        telefono: "1122334455",
        cp: "1629",
      },
    }),
    prisma.lifePolicy.create({
      data: {
        userId: user.id,
        cliente: "Carlos López",
        cuit: "20-11223344-5",
        aseguradora: "Galicia Seguros",
        tipo: "VIDA",
        sumaAsegurada: 3000000,
        prima: 900,
        email: "clopez@yahoo.com",
        telefono: "1155667788",
        cp: "1032",
      },
    }),
  ]);

  console.log("Created 3 life policies");

  // Create commission closes (historical data)
  await Promise.all([
    prisma.commissionClose.create({
      data: { userId: user.id, mes: 1, anio: 2026, totalPrima: 292500, comisionBruta: 45000, crecimiento: null },
    }),
    prisma.commissionClose.create({
      data: { userId: user.id, mes: 2, anio: 2026, totalPrima: 338000, comisionBruta: 52000, crecimiento: 15.6 },
    }),
    prisma.commissionClose.create({
      data: { userId: user.id, mes: 3, anio: 2026, totalPrima: 312000, comisionBruta: 48000, crecimiento: -7.7 },
    }),
  ]);

  console.log("Created 3 commission closes");
  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
