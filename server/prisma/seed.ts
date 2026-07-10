import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "alejandro.rh.diaz@gmail.com";
const ADMIN_PASSWORD = "123456";

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
};

async function resetDemoData(userId: string) {
  const siniestros = await prisma.siniestro.findMany({
    where: { userId },
    select: { id: true },
  });

  await prisma.siniestroNota.deleteMany({
    where: { siniestroId: { in: siniestros.map((s) => s.id) } },
  });

  await prisma.siniestro.deleteMany({ where: { userId } });
  await prisma.cotizacion.deleteMany({ where: { userId } });
  await prisma.policy.deleteMany({ where: { userId } });
  await prisma.lifePolicy.deleteMany({ where: { userId } });
  await prisma.company.deleteMany({ where: { userId } });
  await prisma.client.deleteMany({ where: { userId } });
  await prisma.commissionClose.deleteMany({ where: { userId } });
  await prisma.referral.deleteMany({ where: { referrerId: userId } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.payment.deleteMany({ where: { userId } });
}

async function seedProviderPlans() {
  const plans = [
    {
      plan: "EMPRENDEDOR" as const,
      billingCycle: "MONTHLY" as const,
      price: 19900,
      reason: "PAS Alert Emprendedor Mensual",
      status: "active",
      mpPreapprovalPlanId: "seed-emprendedor-monthly",
    },
    {
      plan: "PROFESIONAL" as const,
      billingCycle: "MONTHLY" as const,
      price: 39900,
      reason: "PAS Alert Profesional Mensual",
      status: "active",
      mpPreapprovalPlanId: "seed-profesional-monthly",
    },
    {
      plan: "AGENCIA" as const,
      billingCycle: "ANNUAL" as const,
      price: 359000,
      reason: "PAS Alert Agencia Anual",
      status: "active",
      mpPreapprovalPlanId: "seed-agencia-annual",
    },
  ];

  await Promise.all(
    plans.map((plan) =>
      prisma.subscriptionProviderPlan.upsert({
        where: { mpPreapprovalPlanId: plan.mpPreapprovalPlanId },
        update: plan,
        create: plan,
      })
    )
  );
}

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const now = new Date();
  const planVencimiento = daysFromNow(3650);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: hashedPassword,
      nombre: "Alejandro Diaz",
      telefono: "1123456789",
      direccion: "Av. Libertador 5500, CABA",
      matriculaPas: "12345",
      isAdmin: true,
      estado: "ACTIVO",
      plan: "PROFESIONAL",
      trialFin: planVencimiento,
      planVencimiento,
      referidosMes: 2,
      referidosTotales: 14,
    },
    create: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      nombre: "Alejandro Diaz",
      telefono: "1123456789",
      direccion: "Av. Libertador 5500, CABA",
      matriculaPas: "12345",
      isAdmin: true,
      estado: "ACTIVO",
      plan: "PROFESIONAL",
      trialInicio: now,
      trialFin: planVencimiento,
      planVencimiento,
      referralCode: "PAS-ALEJANDRO-DEBUG",
      referidosMes: 2,
      referidosTotales: 14,
    },
  });

  await resetDemoData(user.id);
  await seedProviderPlans();

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "Juan Perez",
        dni: "30123456",
        telefono: "1122334455",
        email: "juan.perez@example.com",
        direccion: "Av. Corrientes",
        altura: "1234",
        cp: "1043",
        provincia: "CABA",
        localidad: "Balvanera",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "Maria Garcia",
        dni: "25987654",
        telefono: "1199887766",
        email: "maria.garcia@example.com",
        direccion: "Calle Falsa",
        altura: "123",
        cp: "2000",
        provincia: "Santa Fe",
        localidad: "Rosario",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "Carlos Lopez",
        dni: "35112233",
        telefono: "1155443322",
        email: "carlos.lopez@example.com",
        direccion: "Rivadavia",
        altura: "500",
        cp: "3000",
        provincia: "Santa Fe",
        localidad: "Santa Fe",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "Ana Martinez",
        dni: "28654321",
        telefono: "1144556677",
        email: "ana.martinez@example.com",
        direccion: "San Martin",
        altura: "800",
        cp: "1004",
        provincia: "CABA",
        localidad: "Retiro",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        nombre: "Pedro Sanchez",
        dni: "33445566",
        telefono: "1166778899",
        email: "pedro.sanchez@example.com",
        direccion: "Belgrano",
        altura: "200",
        cp: "1010",
        provincia: "CABA",
        localidad: "Monserrat",
      },
    }),
  ]);

  const companies = await Promise.all([
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Tech Solutions S.A.",
        cuit: "30-12345678-9",
        empleados: 45,
        aseguradora: "Prevencion ART",
        email: "rrhh@techsolutions.example.com",
        telefono: "1144556677",
        direccion: "Av. Libertador",
        altura: "1000",
        cp: "1425",
        provincia: "CABA",
        localidad: "Palermo",
        ramo: "Tecnologia",
        tipo: "ART",
      },
    }),
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Logistica Express S.R.L.",
        cuit: "30-98765432-1",
        empleados: 120,
        aseguradora: "Experta ART",
        email: "info@logisticaexpress.example.com",
        telefono: "1122334455",
        direccion: "Ruta 8",
        altura: "Km 50",
        cp: "1629",
        provincia: "Buenos Aires",
        localidad: "Pilar",
        ramo: "Transporte",
        tipo: "ART",
      },
    }),
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Distribuidora Norte S.A.",
        cuit: "30-11223344-5",
        vehiculos: 12,
        aseguradora: "Sancor Seguros",
        email: "flota@distnorte.example.com",
        telefono: "1155667788",
        direccion: "Pueyrredon",
        altura: "450",
        cp: "1032",
        provincia: "CABA",
        localidad: "Once",
        ramo: "Distribucion",
        tipo: "FLOTAS",
      },
    }),
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Fabrica Textil S.R.L.",
        cuit: "30-55667788-2",
        aseguradora: "Allianz",
        email: "ventas@fabricatextil.example.com",
        telefono: "1166778899",
        direccion: "Warnes",
        altura: "1200",
        cp: "1414",
        provincia: "CABA",
        localidad: "Villa Crespo",
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
        email: "admin@solnaciente.example.com",
        telefono: "1133445566",
        direccion: "Av. Santa Fe",
        altura: "2500",
        cp: "1425",
        provincia: "CABA",
        localidad: "Recoleta",
        ramo: "Consorcio",
        tipo: "CONSORCIO",
      },
    }),
    prisma.company.create({
      data: {
        userId: user.id,
        razonSocial: "Supermercado Don Juan",
        cuit: "30-22334455-1",
        aseguradora: "La Segunda",
        email: "administracion@donjuan.example.com",
        telefono: "1177889900",
        direccion: "Belgrano",
        altura: "300",
        cp: "1001",
        provincia: "CABA",
        localidad: "San Telmo",
        ramo: "Retail",
        tipo: "INTEGRAL_DE_COMERCIO",
      },
    }),
  ]);

  const policies = await Promise.all([
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[0].id,
        clienteNombre: clients[0].nombre,
        clienteDni: clients[0].dni,
        clienteTelefono: clients[0].telefono,
        clienteEmail: clients[0].email,
        aseguradora: "Sancor Seguros",
        rubro: "Automoviles",
        numeroPoliza: "AUTO-4452",
        fechaInicio: daysFromNow(-330),
        fechaVencimiento: daysFromNow(35),
        medioPago: "Tarjeta de credito",
        vigencia: "ANUAL",
        cuotaActual: 11,
        cuotaTotal: 12,
        groupId: "seed-auto-4452",
        prima: 45000,
        moneda: "ARS",
        porcentajeComision: 15,
        comisionCalculada: 6750,
        estado: "ACTIVA",
        tipo: "INDIVIDUAL",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[1].id,
        clienteNombre: clients[1].nombre,
        clienteDni: clients[1].dni,
        clienteTelefono: clients[1].telefono,
        clienteEmail: clients[1].email,
        aseguradora: "Federacion Patronal",
        rubro: "Hogar",
        numeroPoliza: "HOG-9921",
        fechaInicio: daysFromNow(-340),
        fechaVencimiento: daysFromNow(12),
        medioPago: "Debito por CBU",
        vigencia: "ANUAL",
        prima: 18000,
        moneda: "ARS",
        porcentajeComision: 12,
        comisionCalculada: 2160,
        estado: "VENCE_PRONTO",
        tipo: "INDIVIDUAL",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[2].id,
        clienteNombre: clients[2].nombre,
        clienteDni: clients[2].dni,
        clienteTelefono: clients[2].telefono,
        clienteEmail: clients[2].email,
        aseguradora: "La Segunda",
        rubro: "Motovehiculos",
        numeroPoliza: "MOTO-1122",
        fechaInicio: daysFromNow(-380),
        fechaVencimiento: daysFromNow(-15),
        medioPago: "Cupon",
        vigencia: "ANUAL",
        prima: 9500,
        moneda: "ARS",
        porcentajeComision: 10,
        comisionCalculada: 950,
        estado: "VENCIDA",
        tipo: "INDIVIDUAL",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[3].id,
        clienteNombre: clients[3].nombre,
        clienteDni: clients[3].dni,
        clienteTelefono: clients[3].telefono,
        clienteEmail: clients[3].email,
        aseguradora: "Zurich",
        rubro: "Caucion",
        numeroPoliza: "CAU-8877",
        fechaInicio: daysFromNow(-180),
        fechaVencimiento: daysFromNow(185),
        medioPago: "Tarjeta de credito",
        vigencia: "SEMESTRAL",
        prima: 120000,
        moneda: "ARS",
        porcentajeComision: 8,
        comisionCalculada: 9600,
        estado: "ACTIVA",
        tipo: "INDIVIDUAL",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        clienteId: clients[4].id,
        clienteNombre: clients[4].nombre,
        clienteDni: clients[4].dni,
        clienteTelefono: clients[4].telefono,
        clienteEmail: clients[4].email,
        aseguradora: "Mercantil Andina",
        rubro: "Celular / Electronica",
        numeroPoliza: "ELEC-3344",
        fechaInicio: daysFromNow(-60),
        fechaVencimiento: daysFromNow(30),
        medioPago: "Transferencia",
        vigencia: "TRIMESTRAL",
        prima: 3000,
        moneda: "USD",
        porcentajeComision: 8,
        comisionCalculada: 240,
        estado: "ACTIVA",
        tipo: "INDIVIDUAL",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        companyId: companies[0].id,
        clienteNombre: companies[0].razonSocial,
        clienteDni: companies[0].cuit,
        clienteTelefono: companies[0].telefono,
        clienteEmail: companies[0].email,
        aseguradora: "Prevencion ART",
        rubro: "ART",
        numeroPoliza: "ART-101",
        fechaInicio: daysFromNow(-310),
        fechaVencimiento: daysFromNow(55),
        medioPago: "Transferencia",
        vigencia: "ANUAL",
        prima: 50000,
        moneda: "ARS",
        porcentajeComision: 10,
        comisionCalculada: 5000,
        estado: "ACTIVA",
        tipo: "EMPRESA",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        companyId: companies[2].id,
        clienteNombre: companies[2].razonSocial,
        clienteDni: companies[2].cuit,
        clienteTelefono: companies[2].telefono,
        clienteEmail: companies[2].email,
        aseguradora: "Sancor Seguros",
        rubro: "Flotas",
        numeroPoliza: "FLOTA-303",
        fechaInicio: daysFromNow(-200),
        fechaVencimiento: daysFromNow(18),
        medioPago: "Debito por CBU",
        vigencia: "ANUAL",
        prima: 180000,
        moneda: "ARS",
        porcentajeComision: 11,
        comisionCalculada: 19800,
        estado: "VENCE_PRONTO",
        tipo: "EMPRESA",
      },
    }),
    prisma.policy.create({
      data: {
        userId: user.id,
        companyId: companies[4].id,
        clienteNombre: companies[4].razonSocial,
        clienteDni: companies[4].cuit,
        clienteTelefono: companies[4].telefono,
        clienteEmail: companies[4].email,
        aseguradora: "Sancor Seguros",
        rubro: "Consorcio",
        numeroPoliza: "CON-505",
        fechaInicio: daysFromNow(-390),
        fechaVencimiento: daysFromNow(-25),
        medioPago: "Transferencia",
        vigencia: "ANUAL",
        prima: 25000,
        moneda: "ARS",
        porcentajeComision: 12,
        comisionCalculada: 3000,
        estado: "VENCIDA",
        tipo: "EMPRESA",
      },
    }),
  ]);

  const lifePolicies = await Promise.all([
    prisma.lifePolicy.create({
      data: {
        userId: user.id,
        cliente: clients[0].nombre,
        cuit: "20-30123456-9",
        aseguradora: "Zurich",
        tipo: "VIDA",
        sumaAsegurada: 5000000,
        prima: 15000,
        email: clients[0].email,
        telefono: clients[0].telefono,
        cp: clients[0].cp,
      },
    }),
    prisma.lifePolicy.create({
      data: {
        userId: user.id,
        cliente: clients[1].nombre,
        cuit: "27-25987654-1",
        aseguradora: "Sancor Seguros",
        tipo: "RETIRO",
        aporteMensual: 30000,
        fondoAcumulado: 850000,
        email: clients[1].email,
        telefono: clients[1].telefono,
        cp: clients[1].cp,
      },
    }),
    prisma.lifePolicy.create({
      data: {
        userId: user.id,
        cliente: clients[2].nombre,
        cuit: "20-35112233-5",
        aseguradora: "Galicia Seguros",
        tipo: "VIDA",
        sumaAsegurada: 3000000,
        prima: 9000,
        email: clients[2].email,
        telefono: clients[2].telefono,
        cp: clients[2].cp,
      },
    }),
    prisma.lifePolicy.create({
      data: {
        userId: user.id,
        cliente: "Roberto Silva",
        cuit: "20-28901234-1",
        aseguradora: "Zurich",
        tipo: "RETIRO",
        aporteMensual: 45000,
        fondoAcumulado: 1250000,
        email: "roberto.silva@example.com",
        telefono: "1174567890",
        cp: "5000",
      },
    }),
  ]);

  const siniestros = await Promise.all([
    prisma.siniestro.create({
      data: {
        userId: user.id,
        numeroSiniestro: "SIN-2026-0001",
        numeroPoliza: policies[0].numeroPoliza,
        aseguradora: policies[0].aseguradora,
        tipoSeguro: "Automotor",
        clienteNombre: clients[0].nombre,
        clienteDni: clients[0].dni,
        fechaSiniestro: daysFromNow(-4),
        horaSiniestro: "18:35",
        lugarSiniestro: "Av. Cordoba y Medrano, CABA",
        descripcion: "Choque lateral con tercero. Unidad trasladada a taller.",
        patente: "AB123CD",
        marcaModelo: "Toyota Corolla 2021",
        tipoDanio: "Paragolpes y puerta delantera",
        estado: "EN_GESTION",
        prioridad: "MEDIA",
        responsable: "Alejandro Diaz",
        importeReclamado: 420000,
        deducible: 85000,
        ultimoContactoAseguradora: daysFromNow(-1),
        ultimoContactoCliente: daysFromNow(-1),
        notas: {
          create: [
            { texto: "Se solicito denuncia administrativa y fotos del vehiculo." },
            { texto: "Cliente confirma turno de inspeccion para manana." },
          ],
        },
      },
    }),
    prisma.siniestro.create({
      data: {
        userId: user.id,
        numeroSiniestro: "SIN-2026-0002",
        numeroPoliza: policies[1].numeroPoliza,
        aseguradora: policies[1].aseguradora,
        tipoSeguro: "Hogar",
        clienteNombre: clients[1].nombre,
        clienteDni: clients[1].dni,
        fechaSiniestro: daysFromNow(-14),
        lugarSiniestro: "Rosario, Santa Fe",
        descripcion: "Rotura de caneria con danos en piso flotante y muebles bajo mesada.",
        tipoDanio: "Danos por agua",
        estado: "EN_INSPECCION",
        prioridad: "ALTA",
        responsable: "Mesa de siniestros",
        importeReclamado: 720000,
        deducible: 120000,
        ultimoContactoAseguradora: daysFromNow(-8),
        ultimoContactoCliente: daysFromNow(-5),
        notas: {
          create: [
            { texto: "Perito asignado. Falta presupuesto del plomero." },
            { texto: "Se reclamo actualizacion a la aseguradora." },
          ],
        },
      },
    }),
    prisma.siniestro.create({
      data: {
        userId: user.id,
        numeroSiniestro: "SIN-2026-0003",
        numeroPoliza: policies[6].numeroPoliza,
        aseguradora: policies[6].aseguradora,
        tipoSeguro: "Flotas",
        clienteNombre: companies[2].razonSocial,
        clienteDni: companies[2].cuit,
        fechaSiniestro: daysFromNow(-22),
        horaSiniestro: "09:10",
        lugarSiniestro: "Panamericana km 42",
        descripcion: "Siniestro de utilitario de reparto con tercero identificado.",
        patente: "AE456FG",
        marcaModelo: "Renault Kangoo 2022",
        tipoDanio: "Frente y radiador",
        estado: "APROBADO",
        prioridad: "MEDIA",
        responsable: "Flotas",
        importeReclamado: 980000,
        deducible: 150000,
        montoAprobado: 810000,
        ultimoContactoAseguradora: daysFromNow(-2),
        ultimoContactoCliente: daysFromNow(-2),
        notas: {
          create: [{ texto: "Aprobado. Pendiente fecha de pago del taller." }],
        },
      },
    }),
    prisma.siniestro.create({
      data: {
        userId: user.id,
        numeroSiniestro: "SIN-2026-0004",
        numeroPoliza: policies[2].numeroPoliza,
        aseguradora: policies[2].aseguradora,
        tipoSeguro: "Motovehiculos",
        clienteNombre: clients[2].nombre,
        clienteDni: clients[2].dni,
        fechaSiniestro: daysFromNow(-40),
        horaSiniestro: "21:00",
        lugarSiniestro: "Santa Fe capital",
        descripcion: "Robo total recuperado con faltantes.",
        patente: "A112BCD",
        marcaModelo: "Honda Wave 2020",
        tipoDanio: "Robo parcial",
        estado: "PAGADO",
        prioridad: "BAJA",
        responsable: "Alejandro Diaz",
        importeReclamado: 300000,
        deducible: 50000,
        montoAprobado: 220000,
        ultimoContactoAseguradora: daysFromNow(-6),
        ultimoContactoCliente: daysFromNow(-6),
        notas: {
          create: [{ texto: "Pago informado al cliente y caso cerrado." }],
        },
      },
    }),
    prisma.siniestro.create({
      data: {
        userId: user.id,
        numeroSiniestro: "SIN-2026-0005",
        numeroPoliza: policies[7].numeroPoliza,
        aseguradora: policies[7].aseguradora,
        tipoSeguro: "Consorcio",
        clienteNombre: companies[4].razonSocial,
        clienteDni: companies[4].cuit,
        fechaSiniestro: daysFromNow(-9),
        lugarSiniestro: "Av. Santa Fe 2500, CABA",
        descripcion: "Reclamo por filtracion en unidad funcional 7B.",
        tipoDanio: "Responsabilidad civil",
        estado: "DENUNCIADO",
        prioridad: "MEDIA",
        responsable: "Administracion",
        importeReclamado: 180000,
        deducible: 60000,
        ultimoContactoAseguradora: daysFromNow(-7),
        ultimoContactoCliente: daysFromNow(-4),
        notas: {
          create: [{ texto: "Falta acta del consorcio y fotos de la unidad afectada." }],
        },
      },
    }),
  ]);

  const cotizaciones = await prisma.cotizacion.createMany({
    data: [
      {
        userId: user.id,
        tipo: "AUTO",
        origen: "MANUAL",
        nombre: "Sofia",
        apellido: "Benitez",
        cuitCuil: "27-33445566-7",
        fechaNacimiento: "1990-07-12",
        email: "sofia.benitez@example.com",
        celular: "1160012233",
        calle: "Honduras 4200",
        cp: "1414",
        localidad: "Palermo",
        provincia: "CABA",
        marca: "Volkswagen",
        modelo: "Polo",
        anio: 2022,
        patente: "AF321GH",
        tipoUso: "Particular",
        tieneGnc: false,
        tieneGps: true,
        formaPago: "Tarjeta de credito",
      },
      {
        userId: user.id,
        tipo: "MOTO",
        origen: "LINK_PUBLICO",
        nombre: "Diego",
        apellido: "Morales",
        cuitCuil: "20-30111222-4",
        fechaNacimiento: "1987-11-03",
        email: "diego.morales@example.com",
        celular: "1150023344",
        localidad: "La Plata",
        provincia: "Buenos Aires",
        marca: "Yamaha",
        modelo: "FZ 25",
        anio: 2021,
        patente: "A045XYZ",
        tipoUso: "Particular",
        tieneGnc: false,
        tieneGps: false,
        formaPago: "Debito por CBU",
      },
      {
        userId: user.id,
        tipo: "HOGAR",
        origen: "MANUAL",
        nombre: "Natalia",
        apellido: "Ruiz",
        cuitCuil: "27-28999111-8",
        email: "natalia.ruiz@example.com",
        celular: "1133004455",
        calle: "Av. Pellegrini 1500",
        cp: "2000",
        localidad: "Rosario",
        provincia: "Santa Fe",
        tipoVivienda: "Departamento",
        superficieCubierta: 72,
        formaPago: "Transferencia",
        descripcionRiesgo: "Departamento 3 ambientes con balcon y cochera.",
      },
      {
        userId: user.id,
        tipo: "OTROS",
        origen: "LINK_PUBLICO",
        nombre: "Estudio Integral Sur",
        apellido: null,
        cuitCuil: "30-44556677-2",
        email: "contacto@integralsur.example.com",
        celular: "1144005566",
        localidad: "Banfield",
        provincia: "Buenos Aires",
        formaPago: "A convenir",
        descripcionRiesgo: "Consulta por integral de comercio para local gastronomico.",
      },
    ],
  });

  await prisma.commissionClose.createMany({
    data: [
      {
        userId: user.id,
        mes: 1,
        anio: 2026,
        totalPrima: 292500,
        comisionBruta: 45000,
        crecimiento: null,
      },
      {
        userId: user.id,
        mes: 2,
        anio: 2026,
        totalPrima: 338000,
        comisionBruta: 52000,
        crecimiento: 15.6,
      },
      {
        userId: user.id,
        mes: 3,
        anio: 2026,
        totalPrima: 312000,
        comisionBruta: 48000,
        crecimiento: -7.7,
      },
      {
        userId: user.id,
        mes: 4,
        anio: 2026,
        totalPrima: 401000,
        comisionBruta: 63500,
        crecimiento: 28.5,
      },
      {
        userId: user.id,
        mes: 5,
        anio: 2026,
        totalPrima: 436500,
        comisionBruta: 69200,
        crecimiento: 8.9,
      },
    ],
  });

  await prisma.referral.createMany({
    data: [
      {
        referrerId: user.id,
        referredEmail: "martin.productor@example.com",
        status: "active",
        mes: 5,
        anio: 2026,
      },
      {
        referrerId: user.id,
        referredEmail: "camila.seguros@example.com",
        status: "pending",
        mes: 5,
        anio: 2026,
      },
      {
        referrerId: user.id,
        referredEmail: "agencia.rio@example.com",
        status: "active",
        mes: 4,
        anio: 2026,
      },
    ],
  });

  await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: "PROFESIONAL",
      billingCycle: "MONTHLY",
      precio: 39900,
      inicio: daysFromNow(-45),
      fin: daysFromNow(320),
      estado: "activo",
      providerStatus: "authorized",
      mpPreapprovalId: `seed-preapproval-${user.id}`,
      mpPreapprovalPlanId: "seed-profesional-monthly",
      nextPaymentDate: daysFromNow(15),
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        userId: user.id,
        monto: 39900,
        plan: "PROFESIONAL",
        metodoPago: "Mercado Pago",
        mpPaymentId: `seed-payment-${user.id}-001`,
        mpPreapprovalId: `seed-preapproval-${user.id}`,
        estado: "approved",
        createdAt: daysFromNow(-45),
      },
      {
        userId: user.id,
        monto: 39900,
        plan: "PROFESIONAL",
        metodoPago: "Mercado Pago",
        mpPaymentId: `seed-payment-${user.id}-002`,
        mpPreapprovalId: `seed-preapproval-${user.id}`,
        estado: "approved",
        createdAt: daysFromNow(-15),
      },
    ],
  });

  console.log(`Seeded admin: ${user.email}`);
  console.log(`Seeded clients: ${clients.length}`);
  console.log(`Seeded companies: ${companies.length}`);
  console.log(`Seeded policies: ${policies.length}`);
  console.log(`Seeded life policies: ${lifePolicies.length}`);
  console.log(`Seeded siniestros: ${siniestros.length}`);
  console.log(`Seeded cotizaciones: ${cotizaciones.count}`);
  console.log("Seeding completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
