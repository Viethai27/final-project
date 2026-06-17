-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_code_key`(`code`),
    INDEX `departments_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'RECEPTIONIST', 'COORDINATOR', 'DOCTOR', 'LAB_STAFF', 'MANAGER', 'PATIENT') NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_departmentId_idx`(`departmentId`),
    INDEX `users_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `doctor_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `specialty` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `defaultRoomId` VARCHAR(191) NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `doctor_profiles_userId_key`(`userId`),
    UNIQUE INDEX `doctor_profiles_licenseNumber_key`(`licenseNumber`),
    INDEX `doctor_profiles_departmentId_idx`(`departmentId`),
    INDEX `doctor_profiles_defaultRoomId_idx`(`defaultRoomId`),
    INDEX `doctor_profiles_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `doctorId` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `workDate` DATE NOT NULL,
    `shift` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `maxPatients` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `work_schedules_doctorId_workDate_idx`(`doctorId`, `workDate`),
    INDEX `work_schedules_roomId_workDate_idx`(`roomId`, `workDate`),
    INDEX `work_schedules_isActive_idx`(`isActive`),
    UNIQUE INDEX `work_schedules_doctorId_roomId_workDate_shift_key`(`doctorId`, `roomId`, `workDate`, `shift`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `roomType` ENUM('EXAM', 'LAB', 'IMAGING', 'OTHER') NOT NULL,
    `capacity` INTEGER NULL,
    `avgServiceTime` DOUBLE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rooms_code_key`(`code`),
    INDEX `rooms_departmentId_idx`(`departmentId`),
    INDEX `rooms_roomType_idx`(`roomType`),
    INDEX `rooms_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_catalogs` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `serviceType` ENUM('EXAM', 'LAB', 'IMAGING', 'OTHER') NOT NULL,
    `roomTypeRequired` ENUM('EXAM', 'LAB', 'IMAGING', 'OTHER') NULL,
    `isUrgentCls` BOOLEAN NOT NULL DEFAULT false,
    `targetWaitTime` INTEGER NULL,
    `avgDuration` DOUBLE NULL,
    `price` DECIMAL(14, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_catalogs_code_key`(`code`),
    INDEX `service_catalogs_serviceType_idx`(`serviceType`),
    INDEX `service_catalogs_roomTypeRequired_idx`(`roomTypeRequired`),
    INDEX `service_catalogs_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_rooms` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `service_rooms_roomId_idx`(`roomId`),
    UNIQUE INDEX `service_rooms_serviceId_roomId_key`(`serviceId`, `roomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patients` (
    `id` VARCHAR(191) NOT NULL,
    `patientCode` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `gender` VARCHAR(191) NULL,
    `dateOfBirth` DATE NULL,
    `age` INTEGER NULL,
    `idNumber` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `insuranceNumber` VARCHAR(191) NULL,
    `isDisabledHeavy` BOOLEAN NOT NULL DEFAULT false,
    `isDisabled` BOOLEAN NOT NULL DEFAULT false,
    `isRevolutionary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `patients_patientCode_key`(`patientCode`),
    UNIQUE INDEX `patients_idNumber_key`(`idNumber`),
    INDEX `patients_patientCode_idx`(`patientCode`),
    INDEX `patients_idNumber_idx`(`idNumber`),
    INDEX `patients_phone_idx`(`phone`),
    INDEX `patients_fullName_idx`(`fullName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `doctorId` VARCHAR(191) NULL,
    `roomId` VARCHAR(191) NULL,
    `scheduleId` VARCHAR(191) NULL,
    `appointmentTime` DATETIME(3) NOT NULL,
    `serviceId` VARCHAR(191) NULL,
    `status` ENUM('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'LATE', 'NO_SHOW', 'CANCELLED') NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `appointments_patientId_idx`(`patientId`),
    INDEX `appointments_doctorId_idx`(`doctorId`),
    INDEX `appointments_roomId_idx`(`roomId`),
    INDEX `appointments_scheduleId_idx`(`scheduleId`),
    INDEX `appointments_serviceId_idx`(`serviceId`),
    INDEX `appointments_status_idx`(`status`),
    INDEX `appointments_appointmentTime_idx`(`appointmentTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visits` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `appointmentId` VARCHAR(191) NULL,
    `visitDate` DATE NOT NULL,
    `queueNumber` VARCHAR(191) NULL,
    `chiefComplaint` TEXT NULL,
    `isUrgent` BOOLEAN NOT NULL DEFAULT false,
    `isPregnantAtVisit` BOOLEAN NOT NULL DEFAULT false,
    `priorityReason` ENUM('EMERGENCY', 'CHILD_UNDER_6', 'PREGNANT', 'DISABLED', 'HEAVY_DISABLED', 'ELDERLY_75PLUS', 'REVOLUTIONARY_CONTRIBUTOR', 'AFTER_CLS', 'APPOINTMENT', 'OTHER') NULL,
    `arrivedAt` DATETIME(3) NULL,
    `checkedInAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NULL,

    UNIQUE INDEX `visits_appointmentId_key`(`appointmentId`),
    INDEX `visits_patientId_idx`(`patientId`),
    INDEX `visits_appointmentId_idx`(`appointmentId`),
    INDEX `visits_visitDate_idx`(`visitDate`),
    INDEX `visits_createdAt_idx`(`createdAt`),
    INDEX `visits_priorityReason_idx`(`priorityReason`),
    INDEX `visits_isPregnantAtVisit_idx`(`isPregnantAtVisit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_progress` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `currentState` ENUM('WAITING_EXAM', 'IN_EXAM', 'WAITING_CLS', 'IN_CLS', 'WAITING_RESULT', 'WAITING_CONCLUSION', 'IN_CONCLUSION', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED') NOT NULL,
    `laneType` ENUM('APPOINTMENT', 'AFTER_CLS', 'PRIORITY', 'NORMAL') NOT NULL,
    `sameDoctorRequired` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    UNIQUE INDEX `visit_progress_visitId_key`(`visitId`),
    INDEX `visit_progress_currentState_idx`(`currentState`),
    INDEX `visit_progress_laneType_idx`(`laneType`),
    INDEX `visit_progress_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_state_histories` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `fromState` ENUM('WAITING_EXAM', 'IN_EXAM', 'WAITING_CLS', 'IN_CLS', 'WAITING_RESULT', 'WAITING_CONCLUSION', 'IN_CONCLUSION', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED') NULL,
    `toState` ENUM('WAITING_EXAM', 'IN_EXAM', 'WAITING_CLS', 'IN_CLS', 'WAITING_RESULT', 'WAITING_CONCLUSION', 'IN_CONCLUSION', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED') NOT NULL,
    `triggerEvent` VARCHAR(191) NULL,
    `triggeredById` VARCHAR(191) NULL,
    `transitionedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` TEXT NULL,
    `durationInState` INTEGER NULL,

    INDEX `visit_state_histories_visitId_transitionedAt_idx`(`visitId`, `transitionedAt`),
    INDEX `visit_state_histories_toState_idx`(`toState`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_clinicals` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `provisionalDiagnosis` TEXT NULL,
    `finalDiagnosis` TEXT NULL,
    `conclusion` TEXT NULL,
    `treatmentPlan` TEXT NULL,
    `clinicalNotes` TEXT NULL,
    `cancelReason` TEXT NULL,
    `examStartAt` DATETIME(3) NULL,
    `clsStartAt` DATETIME(3) NULL,
    `clsDoneAt` DATETIME(3) NULL,
    `conclusionStartAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `totalWaitMinutes` INTEGER NULL,
    `totalVisitMinutes` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `visit_clinicals_visitId_key`(`visitId`),
    INDEX `visit_clinicals_visitId_idx`(`visitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `doctorId` VARCHAR(191) NULL,
    `roomId` VARCHAR(191) NULL,
    `assignedById` VARCHAR(191) NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    `assignmentReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `visit_assignments_visitId_idx`(`visitId`),
    INDEX `visit_assignments_doctorId_idx`(`doctorId`),
    INDEX `visit_assignments_roomId_idx`(`roomId`),
    INDEX `visit_assignments_isCurrent_idx`(`isCurrent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `queue_items` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `queueType` ENUM('EXAM', 'CLS', 'CONCLUSION', 'PAYMENT') NOT NULL,
    `laneType` ENUM('APPOINTMENT', 'AFTER_CLS', 'PRIORITY', 'NORMAL') NOT NULL,
    `targetRoomId` VARCHAR(191) NULL,
    `targetDoctorId` VARCHAR(191) NULL,
    `isBase` BOOLEAN NOT NULL DEFAULT false,
    `isUrgent` BOOLEAN NOT NULL DEFAULT false,
    `isAgePriority` BOOLEAN NOT NULL DEFAULT false,
    `isPregnantPriority` BOOLEAN NOT NULL DEFAULT false,
    `priorityReason` ENUM('EMERGENCY', 'CHILD_UNDER_6', 'PREGNANT', 'DISABLED', 'HEAVY_DISABLED', 'ELDERLY_75PLUS', 'REVOLUTIONARY_CONTRIBUTOR', 'AFTER_CLS', 'APPOINTMENT', 'OTHER') NULL,
    `initialPriorityScore` DOUBLE NOT NULL,
    `appointmentTime` DATETIME(3) NULL,
    `enqueuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NULL,
    `sameDoctorRequired` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `queue_items_visitId_idx`(`visitId`),
    INDEX `queue_items_queueType_idx`(`queueType`),
    INDEX `queue_items_laneType_idx`(`laneType`),
    INDEX `queue_items_targetRoomId_idx`(`targetRoomId`),
    INDEX `queue_items_targetDoctorId_idx`(`targetDoctorId`),
    INDEX `queue_items_enqueuedAt_idx`(`enqueuedAt`),
    INDEX `queue_items_sameDoctorRequired_idx`(`sameDoctorRequired`),
    INDEX `queue_items_priorityReason_idx`(`priorityReason`),
    INDEX `queue_items_isPregnantPriority_idx`(`isPregnantPriority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `queue_item_statuses` (
    `id` VARCHAR(191) NOT NULL,
    `queueItemId` VARCHAR(191) NOT NULL,
    `status` ENUM('WAITING', 'CALLED', 'SERVING', 'DONE', 'TIMEOUT', 'CANCELLED') NOT NULL,
    `priorityScore` DOUBLE NOT NULL,
    `lastScoreUpdated` DATETIME(3) NULL,
    `calledAt` DATETIME(3) NULL,
    `servedAt` DATETIME(3) NULL,
    `dequeuedAt` DATETIME(3) NULL,
    `isTimeout` BOOLEAN NOT NULL DEFAULT false,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `queue_item_statuses_queueItemId_key`(`queueItemId`),
    INDEX `queue_item_statuses_status_idx`(`status`),
    INDEX `queue_item_statuses_priorityScore_idx`(`priorityScore`),
    INDEX `queue_item_statuses_calledAt_idx`(`calledAt`),
    INDEX `queue_item_statuses_servedAt_idx`(`servedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `queue_item_histories` (
    `id` VARCHAR(191) NOT NULL,
    `queueItemId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('WAITING', 'CALLED', 'SERVING', 'DONE', 'TIMEOUT', 'CANCELLED') NULL,
    `toStatus` ENUM('WAITING', 'CALLED', 'SERVING', 'DONE', 'TIMEOUT', 'CANCELLED') NULL,
    `fromScore` DOUBLE NULL,
    `toScore` DOUBLE NULL,
    `eventTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `triggeredBy` VARCHAR(191) NULL,
    `triggeredByUserId` VARCHAR(191) NULL,
    `note` TEXT NULL,

    INDEX `queue_item_histories_queueItemId_idx`(`queueItemId`),
    INDEX `queue_item_histories_eventTime_idx`(`eventTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `turns` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `doctorId` VARCHAR(191) NULL,
    `queueItemId` VARCHAR(191) NULL,
    `turnType` ENUM('CLINICAL_EXAM', 'CLS_LAB', 'CLS_IMAGING', 'CONCLUSION', 'PAYMENT') NOT NULL,
    `serviceId` VARCHAR(191) NULL,
    `timeoutThreshold` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `turns_visitId_idx`(`visitId`),
    INDEX `turns_roomId_idx`(`roomId`),
    INDEX `turns_doctorId_idx`(`doctorId`),
    INDEX `turns_queueItemId_idx`(`queueItemId`),
    INDEX `turns_turnType_idx`(`turnType`),
    INDEX `turns_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `turn_progress` (
    `id` VARCHAR(191) NOT NULL,
    `turnId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'TIMEOUT', 'CANCELLED') NOT NULL,
    `calledAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `timeoutAt` DATETIME(3) NULL,
    `durationMinutes` INTEGER NULL,
    `note` TEXT NULL,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `turn_progress_turnId_key`(`turnId`),
    INDEX `turn_progress_status_idx`(`status`),
    INDEX `turn_progress_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cls_orders` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `orderedById` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NULL,
    `priority` ENUM('ROUTINE', 'URGENT') NOT NULL,
    `status` ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL,
    `orderedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `clinicalNote` TEXT NULL,
    `note` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cls_orders_visitId_idx`(`visitId`),
    INDEX `cls_orders_serviceId_idx`(`serviceId`),
    INDEX `cls_orders_roomId_idx`(`roomId`),
    INDEX `cls_orders_status_idx`(`status`),
    INDEX `cls_orders_orderedAt_idx`(`orderedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cls_results` (
    `id` VARCHAR(191) NOT NULL,
    `clsOrderId` VARCHAR(191) NOT NULL,
    `resultDate` DATETIME(3) NULL,
    `resultFileUrl` VARCHAR(191) NULL,
    `resultText` TEXT NULL,
    `resultAt` DATETIME(3) NULL,
    `resultById` VARCHAR(191) NULL,
    `isAbnormal` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cls_results_clsOrderId_key`(`clsOrderId`),
    INDEX `cls_results_clsOrderId_idx`(`clsOrderId`),
    INDEX `cls_results_isAbnormal_idx`(`isAbnormal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resource_loads` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL,
    `currentLoad` INTEGER NOT NULL,
    `queueLength` INTEGER NOT NULL,
    `utilizationRate` DOUBLE NOT NULL,
    `waitTimeRatio` DOUBLE NULL,
    `queuePressure` DOUBLE NULL,
    `avgActualWait` DOUBLE NULL,
    `avgServiceTime` DOUBLE NULL,
    `alertLevel` ENUM('NORMAL', 'WARNING', 'OVERLOAD') NOT NULL,
    `doctorAvailable` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `resource_loads_roomId_idx`(`roomId`),
    INDEX `resource_loads_recordedAt_idx`(`recordedAt`),
    INDEX `resource_loads_alertLevel_idx`(`alertLevel`),
    UNIQUE INDEX `resource_loads_roomId_recordedAt_key`(`roomId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `queue_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `snapshotTime` DATETIME(3) NOT NULL,
    `queueTime` DOUBLE NULL,
    `utilizationRate` DOUBLE NULL,
    `waitTimeRatio` DOUBLE NULL,
    `avgWaitMinutes` DOUBLE NULL,
    `laneAppointmentCount` INTEGER NOT NULL DEFAULT 0,
    `laneAfterClsCount` INTEGER NOT NULL DEFAULT 0,
    `lanePriorityCount` INTEGER NOT NULL DEFAULT 0,
    `laneNormalCount` INTEGER NOT NULL DEFAULT 0,
    `alertLevel` ENUM('NORMAL', 'WARNING', 'OVERLOAD') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `queue_snapshots_roomId_idx`(`roomId`),
    INDEX `queue_snapshots_snapshotTime_idx`(`snapshotTime`),
    INDEX `queue_snapshots_alertLevel_idx`(`alertLevel`),
    UNIQUE INDEX `queue_snapshots_roomId_snapshotTime_key`(`roomId`, `snapshotTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatch_decisions` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `queueItemId` VARCHAR(191) NULL,
    `decisionById` VARCHAR(191) NULL,
    `decisionTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decisionType` ENUM('SYSTEM_SUGGESTED', 'MANUAL', 'OVERRIDE') NOT NULL,
    `outcomeRoomId` VARCHAR(191) NULL,
    `outcomeDoctorId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dispatch_decisions_visitId_idx`(`visitId`),
    INDEX `dispatch_decisions_queueItemId_idx`(`queueItemId`),
    INDEX `dispatch_decisions_decisionTime_idx`(`decisionTime`),
    INDEX `dispatch_decisions_decisionType_idx`(`decisionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatch_recommendations` (
    `id` VARCHAR(191) NOT NULL,
    `decisionId` VARCHAR(191) NOT NULL,
    `rank` INTEGER NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `resourceScore` DOUBLE NULL,
    `queueLength` INTEGER NULL,
    `utilizationRate` DOUBLE NULL,
    `estimatedWaitMinutes` DOUBLE NULL,
    `alertLevel` ENUM('NORMAL', 'WARNING', 'OVERLOAD') NULL,
    `reason` TEXT NULL,
    `wasSelected` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dispatch_recommendations_decisionId_idx`(`decisionId`),
    INDEX `dispatch_recommendations_roomId_idx`(`roomId`),
    UNIQUE INDEX `dispatch_recommendations_decisionId_rank_key`(`decisionId`, `rank`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatch_outcomes` (
    `id` VARCHAR(191) NOT NULL,
    `decisionId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NULL,
    `followedRecommendation` BOOLEAN NULL,
    `deviationNote` TEXT NULL,
    `actualWaitMinutes` DOUBLE NULL,
    `recommendedWaitEstimate` DOUBLE NULL,
    `waitDifference` DOUBLE NULL,
    `deviationReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dispatch_outcomes_decisionId_key`(`decisionId`),
    INDEX `dispatch_outcomes_decisionId_idx`(`decisionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `escalation_logs` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `escalatedById` VARCHAR(191) NULL,
    `escalationTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `escalationType` VARCHAR(191) NOT NULL,
    `fromLane` ENUM('APPOINTMENT', 'AFTER_CLS', 'PRIORITY', 'NORMAL') NULL,
    `toLane` ENUM('APPOINTMENT', 'AFTER_CLS', 'PRIORITY', 'NORMAL') NULL,
    `fromPriorityScore` DOUBLE NULL,
    `toPriorityScore` DOUBLE NULL,
    `reason` TEXT NULL,
    `outcome` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `escalation_logs_visitId_idx`(`visitId`),
    INDEX `escalation_logs_escalationTime_idx`(`escalationTime`),
    INDEX `escalation_logs_fromLane_idx`(`fromLane`),
    INDEX `escalation_logs_toLane_idx`(`toLane`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `paidAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `status` ENUM('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED') NOT NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_visitId_key`(`visitId`),
    INDEX `invoices_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(14, 2) NOT NULL,
    `totalPrice` DECIMAL(14, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoice_items_invoiceId_idx`(`invoiceId`),
    INDEX `invoice_items_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doctor_profiles` ADD CONSTRAINT `doctor_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doctor_profiles` ADD CONSTRAINT `doctor_profiles_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doctor_profiles` ADD CONSTRAINT `doctor_profiles_defaultRoomId_fkey` FOREIGN KEY (`defaultRoomId`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_schedules` ADD CONSTRAINT `work_schedules_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_schedules` ADD CONSTRAINT `work_schedules_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_rooms` ADD CONSTRAINT `service_rooms_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service_catalogs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_rooms` ADD CONSTRAINT `service_rooms_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctor_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `work_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service_catalogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visits` ADD CONSTRAINT `visits_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visits` ADD CONSTRAINT `visits_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visits` ADD CONSTRAINT `visits_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_progress` ADD CONSTRAINT `visit_progress_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_progress` ADD CONSTRAINT `visit_progress_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_state_histories` ADD CONSTRAINT `visit_state_histories_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_state_histories` ADD CONSTRAINT `visit_state_histories_triggeredById_fkey` FOREIGN KEY (`triggeredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_clinicals` ADD CONSTRAINT `visit_clinicals_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_assignments` ADD CONSTRAINT `visit_assignments_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_assignments` ADD CONSTRAINT `visit_assignments_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctor_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_assignments` ADD CONSTRAINT `visit_assignments_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_assignments` ADD CONSTRAINT `visit_assignments_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_items` ADD CONSTRAINT `queue_items_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_items` ADD CONSTRAINT `queue_items_targetRoomId_fkey` FOREIGN KEY (`targetRoomId`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_items` ADD CONSTRAINT `queue_items_targetDoctorId_fkey` FOREIGN KEY (`targetDoctorId`) REFERENCES `doctor_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_items` ADD CONSTRAINT `queue_items_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_item_statuses` ADD CONSTRAINT `queue_item_statuses_queueItemId_fkey` FOREIGN KEY (`queueItemId`) REFERENCES `queue_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_item_statuses` ADD CONSTRAINT `queue_item_statuses_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_item_histories` ADD CONSTRAINT `queue_item_histories_queueItemId_fkey` FOREIGN KEY (`queueItemId`) REFERENCES `queue_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_item_histories` ADD CONSTRAINT `queue_item_histories_triggeredByUserId_fkey` FOREIGN KEY (`triggeredByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turns` ADD CONSTRAINT `turns_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turns` ADD CONSTRAINT `turns_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turns` ADD CONSTRAINT `turns_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctor_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turns` ADD CONSTRAINT `turns_queueItemId_fkey` FOREIGN KEY (`queueItemId`) REFERENCES `queue_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turns` ADD CONSTRAINT `turns_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service_catalogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turns` ADD CONSTRAINT `turns_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turn_progress` ADD CONSTRAINT `turn_progress_turnId_fkey` FOREIGN KEY (`turnId`) REFERENCES `turns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turn_progress` ADD CONSTRAINT `turn_progress_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cls_orders` ADD CONSTRAINT `cls_orders_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cls_orders` ADD CONSTRAINT `cls_orders_orderedById_fkey` FOREIGN KEY (`orderedById`) REFERENCES `doctor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cls_orders` ADD CONSTRAINT `cls_orders_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service_catalogs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cls_orders` ADD CONSTRAINT `cls_orders_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cls_results` ADD CONSTRAINT `cls_results_clsOrderId_fkey` FOREIGN KEY (`clsOrderId`) REFERENCES `cls_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cls_results` ADD CONSTRAINT `cls_results_resultById_fkey` FOREIGN KEY (`resultById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resource_loads` ADD CONSTRAINT `resource_loads_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_snapshots` ADD CONSTRAINT `queue_snapshots_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_decisions` ADD CONSTRAINT `dispatch_decisions_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_decisions` ADD CONSTRAINT `dispatch_decisions_queueItemId_fkey` FOREIGN KEY (`queueItemId`) REFERENCES `queue_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_decisions` ADD CONSTRAINT `dispatch_decisions_decisionById_fkey` FOREIGN KEY (`decisionById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_decisions` ADD CONSTRAINT `dispatch_decisions_outcomeRoomId_fkey` FOREIGN KEY (`outcomeRoomId`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_decisions` ADD CONSTRAINT `dispatch_decisions_outcomeDoctorId_fkey` FOREIGN KEY (`outcomeDoctorId`) REFERENCES `doctor_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_recommendations` ADD CONSTRAINT `dispatch_recommendations_decisionId_fkey` FOREIGN KEY (`decisionId`) REFERENCES `dispatch_decisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_recommendations` ADD CONSTRAINT `dispatch_recommendations_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_outcomes` ADD CONSTRAINT `dispatch_outcomes_decisionId_fkey` FOREIGN KEY (`decisionId`) REFERENCES `dispatch_decisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_outcomes` ADD CONSTRAINT `dispatch_outcomes_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service_catalogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_escalatedById_fkey` FOREIGN KEY (`escalatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service_catalogs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

