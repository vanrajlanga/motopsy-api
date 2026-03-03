-- ========================================================================
-- MOTOPSY: Inspection Parameter Template Filter Assignment
-- Used Car Inspection vs New Car PDI
-- Generated: 2026-03-03
-- Apply to: motopsy_db (production)
-- ========================================================================
-- RESEARCH BASIS:
--   PDI module weights: Paint 30%, Structural 15%, Docs 15%,
--   Electrical 12%, Interior 12%, Suspension 8%, Engine 8%,
--   Transmission 0%, Road Test 0%
--
--   Guiding principle:
--     NULL           = applies to BOTH templates
--     'used_car'     = hidden from PDI (irrelevant or impossible for new car)
--     'new_car_pdi'  = new PDI-only parameters added below
-- ========================================================================

START TRANSACTION;

-- ========================================================================
-- SECTION 1: RESET — safety measure, start from known clean state
-- (keeps Transmission, Road Test, Service & History already set correctly)
-- ========================================================================

-- Remove any stale values from earlier partial runs (only clear non-correct ones)
-- This no-ops if template_filter is NULL already.

-- ========================================================================
-- SECTION 2: USED-CAR-ONLY PARAMETERS (individual)
-- (Transmission=mod2, Road Test=mod9, Service & History=sg30 already set)
-- ========================================================================

UPDATE inspection_parameters SET template_filter = 'used_car' WHERE id IN (

  -- Engine System: diagnostics & fluids that reflect WEAR (impossible on new car)
  35,   -- OBD Historical Codes         (past fault history only exists on used cars)
  63,   -- Metal Particles in Oil       (wear residue; new oil has none)
  64,   -- Oil Sludge Presence          (oil degradation from extended use; impossible new)

  -- Structural: underbody rust develops with age, not on delivery day
  120,  -- Underbody Rust Severity      (rust accumulates with time/exposure)

  -- Paint & Panel Cosmetic: road-use damage indicators, not transit damage
  169,  -- Rust Spot Presence           (cosmetic surface rust = age/use)
  172,  -- Stone Chip Severity          (road debris damage, not on new car)
  178,  -- Windshield Replaced          (replacement = prior incident history)

  -- Suspension: wear pattern analysis
  269,  -- Uneven Tyre Wear             (uneven wear develops from use/misalignment over time)

  -- Interior: odometer fraud indicators (irrelevant for new car)
  317,  -- Pedal Wear vs Odometer       (comparing wear to mileage = odometer fraud check)
  322,  -- Steering Wear vs Odometer    (same — odometer fraud indicator)

  -- Documentation > Registration & Legal: RC-based checks
  -- RC (Registration Certificate) is issued AFTER first registration, not at PDI
  336,  -- FASTag Linkage               (linked to RC number; RC not yet issued at PDI)
  337,  -- Hypothecation Status         (bank loan on registered vehicle)
  338,  -- Insurance Validity           (existing policy on registered vehicle)
  339,  -- Loan NOC                     (loan clearance for registered vehicle)
  340,  -- NCB Status                   (no-claim bonus; only on prior policy)
  341,  -- Ownership Count              (ownership transfer history)
  342,  -- Pending Challans             (traffic challans on registration number)
  343,  -- Pollution Certificate        (PUC issued to registered vehicles only)
  344,  -- RC Original Verification     (RC does not exist at point of PDI delivery)
  345   -- Registration State Match     (checks if RTO state matches; not applicable PDI)

);

-- ========================================================================
-- SECTION 3: EXCEPTIONS — override any bulk-set values where BOTH apply
-- ========================================================================

-- Recall Pending is relevant for BOTH:
-- New cars CAN have an active recall. Dealer must verify before delivery.
UPDATE inspection_parameters
SET template_filter = NULL
WHERE id = 349; -- Recall Pending (was bulk-set to used_car via sg30)

-- ========================================================================
-- SECTION 4: ADD NEW PDI DOCUMENTATION SUBGROUP
-- ========================================================================

INSERT INTO inspection_sub_groups (id, module_id, name, sort_order)
VALUES (39, 8, 'PDI Documentation', 3);

-- ========================================================================
-- SECTION 5: ADD NEW PDI-ONLY PARAMETERS
-- param_numbers 421-428 (current max = 420)
-- ========================================================================

-- ── 5a. Interior & Safety > Equipment & Safety (sg_id=28) ────────────────
-- PDI-specific equipment checks (sort_order continues from existing 11 params)

INSERT INTO inspection_parameters (
  sub_group_id, param_number, name, detail,
  input_type,
  option_1, option_2,
  score_1,  score_2,
  fuel_filter, transmission_filter,
  is_red_flag, sort_order, is_active, weightage,
  template_filter, created_at
) VALUES
(
  28, 421,
  'Floor Mat Set',
  'Verify all floor mats — driver, co-driver, and rear passengers — are present and properly fitted as per vehicle specification. Missing mats indicate incomplete accessory delivery.',
  'yes_no',
  'Present', 'Missing',
  1.00, 0.00,
  'All', 'All',
  0, 12, 1, 1.00,
  'new_car_pdi', NOW()
),
(
  28, 422,
  'Transit Protective Film Removed',
  'Confirm all factory transit protective films are fully removed: paint surfaces, door sills, seat covers, dashboard, steering wheel, gear lever, and door handles. Residual film left indicates incomplete PDI preparation.',
  'pass_fail',
  'Fully Removed', 'Residue Present',
  1.00, 0.00,
  'All', 'All',
  0, 13, 1, 1.00,
  'new_car_pdi', NOW()
);

-- ── 5b. Documentation Validation > PDI Documentation (sg_id=39) ─────────
-- Critical PDI delivery documents

INSERT INTO inspection_parameters (
  sub_group_id, param_number, name, detail,
  input_type,
  option_1, option_2,
  score_1,  score_2,
  fuel_filter, transmission_filter,
  is_red_flag, sort_order, is_active, weightage,
  template_filter, created_at
) VALUES
(
  39, 423,
  'Manufacturer Invoice Verified',
  'Cross-verify the manufacturer delivery invoice/challan against vehicle VIN, model, variant, color, and all booked accessories. Any mismatch is a critical red flag — wrong car or accessories.',
  'pass_fail',
  'Match', 'Mismatch',
  1.00, 0.00,
  'All', 'All',
  1, 1, 1, 3.00,
  'new_car_pdi', NOW()
),
(
  39, 424,
  'Temp Registration / Trade Plate',
  'Verify a valid temporary registration number (TR) or authorised trade certificate plate is displayed. An expired or missing TR must be resolved before road test or delivery.',
  'pass_fail',
  'Valid', 'Invalid/Missing',
  1.00, 0.00,
  'All', 'All',
  0, 2, 1, 2.00,
  'new_car_pdi', NOW()
),
(
  39, 425,
  'Insurance Policy (New Vehicle)',
  'Verify a valid motor insurance policy is in place covering the correct chassis number, IDV/agreed value, and customer name. Check policy commencement date and type (comprehensive vs third-party).',
  'pass_fail',
  'Valid', 'Missing/Invalid',
  1.00, 0.00,
  'All', 'All',
  1, 3, 1, 3.00,
  'new_car_pdi', NOW()
),
(
  39, 426,
  'Owner''s Manual Present',
  'Confirm the vehicle owner''s manual (and audio/infotainment/EV manual if separate) is present in the glove box. Essential for customer handover.',
  'yes_no',
  'Present', 'Missing',
  1.00, 0.00,
  'All', 'All',
  0, 4, 1, 1.00,
  'new_car_pdi', NOW()
),
(
  39, 427,
  'Warranty Card Present & Stamped',
  'Verify the manufacturer warranty card is present, stamped/signed by the authorized dealer, with delivery date and VIN legibly noted. An unsigned or missing warranty card is a service-rights risk for the customer.',
  'pass_fail',
  'Valid & Stamped', 'Missing/Unstamped',
  1.00, 0.00,
  'All', 'All',
  0, 5, 1, 2.00,
  'new_car_pdi', NOW()
),
(
  39, 428,
  'First Free Service Coupon',
  'Confirm the first free/complimentary service coupon booklet is provided to the customer as per the manufacturer''s policy. Also check if second and third free service coupons are included if applicable.',
  'yes_no',
  'Present', 'Missing',
  1.00, 0.00,
  'All', 'All',
  0, 6, 1, 1.00,
  'new_car_pdi', NOW()
);

COMMIT;

-- ========================================================================
-- VERIFICATION QUERIES (run after commit to confirm)
-- ========================================================================

SELECT
  template_filter,
  COUNT(*) AS param_count
FROM inspection_parameters
GROUP BY template_filter
ORDER BY COALESCE(template_filter, 'zzz');

SELECT
  m.name AS module,
  sg.name AS subgroup,
  p.param_number,
  p.name AS param,
  p.template_filter
FROM inspection_parameters p
JOIN inspection_sub_groups sg ON sg.id = p.sub_group_id
JOIN inspection_modules m ON m.id = sg.module_id
WHERE p.template_filter = 'new_car_pdi'
ORDER BY m.sort_order, sg.sort_order, p.sort_order;

-- ========================================================================
-- SECTION 6: REBALANCE MODULE WEIGHTS TO 100%
-- Paint & Panel went to 142% (42 new panel params added with default 1.00)
-- Interior & Safety went to 102% (2 new PDI params)
-- Documentation went to 112% (6 new PDI doc params)
-- ========================================================================

-- Step 1: Proportional rescale
UPDATE inspection_parameters p
JOIN inspection_sub_groups sg ON sg.id = p.sub_group_id
SET p.weightage = ROUND(p.weightage * (100.0 / 142.0), 2)
WHERE sg.module_id = 4;

UPDATE inspection_parameters p
JOIN inspection_sub_groups sg ON sg.id = p.sub_group_id
SET p.weightage = ROUND(p.weightage * (100.0 / 102.0), 2)
WHERE sg.module_id = 7;

UPDATE inspection_parameters p
JOIN inspection_sub_groups sg ON sg.id = p.sub_group_id
SET p.weightage = ROUND(p.weightage * (100.0 / 112.0), 2)
WHERE sg.module_id = 8;

-- Step 2: Fix rounding drift — adjust heaviest param to absorb difference
UPDATE inspection_parameters p
JOIN inspection_sub_groups sg ON sg.id = p.sub_group_id
SET p.weightage = p.weightage + (100.00 - (SELECT ROUND(SUM(p2.weightage),2) FROM inspection_parameters p2 JOIN inspection_sub_groups sg2 ON sg2.id = p2.sub_group_id WHERE sg2.module_id = 4))
WHERE sg.module_id = 4 AND p.id = (SELECT id FROM (SELECT p3.id FROM inspection_parameters p3 JOIN inspection_sub_groups sg3 ON sg3.id = p3.sub_group_id WHERE sg3.module_id = 4 ORDER BY p3.weightage DESC LIMIT 1) t);

UPDATE inspection_parameters p
JOIN inspection_sub_groups sg ON sg.id = p.sub_group_id
SET p.weightage = p.weightage + (100.00 - (SELECT ROUND(SUM(p2.weightage),2) FROM inspection_parameters p2 JOIN inspection_sub_groups sg2 ON sg2.id = p2.sub_group_id WHERE sg2.module_id = 7))
WHERE sg.module_id = 7 AND p.id = (SELECT id FROM (SELECT p3.id FROM inspection_parameters p3 JOIN inspection_sub_groups sg3 ON sg3.id = p3.sub_group_id WHERE sg3.module_id = 7 ORDER BY p3.weightage DESC LIMIT 1) t);

UPDATE inspection_parameters p
JOIN inspection_sub_groups sg ON sg.id = p.sub_group_id
SET p.weightage = p.weightage + (100.00 - (SELECT ROUND(SUM(p2.weightage),2) FROM inspection_parameters p2 JOIN inspection_sub_groups sg2 ON sg2.id = p2.sub_group_id WHERE sg2.module_id = 8))
WHERE sg.module_id = 8 AND p.id = (SELECT id FROM (SELECT p3.id FROM inspection_parameters p3 JOIN inspection_sub_groups sg3 ON sg3.id = p3.sub_group_id WHERE sg3.module_id = 8 ORDER BY p3.weightage DESC LIMIT 1) t);
