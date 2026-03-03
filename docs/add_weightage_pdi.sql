-- ============================================================================
-- MOTOPSY: Add weightage_pdi column to inspection_parameters
-- Purpose: Allow per-template parameter weights (Used Car vs New Car PDI)
-- Generated: 2026-03-03
-- Apply to: motopsy_db (production)
-- Run steps in order: Step 1 → Step 2 → Step 3 → verify with Step 4
-- ============================================================================

-- Step 1: Add column
-- NULL means "use weightage for both templates"
-- When set, PDI scoring uses this value; Used Car scoring always uses weightage

ALTER TABLE inspection_parameters
  ADD COLUMN weightage_pdi DECIMAL(5,2) NULL DEFAULT NULL
  COMMENT 'PDI-specific weight; NULL = use weightage for both templates'
  AFTER weightage;

-- ============================================================================
-- Step 2: Proportionally scale weightage_pdi for all PDI-visible params
--
-- Logic: each module's PDI-visible params (template_filter IS NULL or 'new_car_pdi')
-- currently sum to <100% because used_car-only params are excluded.
-- This step sets weightage_pdi = weightage * (100 / module_pdi_sum)
-- so that each module's PDI weights sum to exactly 100%.
-- ============================================================================

UPDATE inspection_parameters p
JOIN inspection_sub_groups sg ON p.sub_group_id = sg.id
JOIN (
  SELECT sg2.module_id, SUM(p2.weightage) AS pdi_sum
  FROM inspection_parameters p2
  JOIN inspection_sub_groups sg2 ON p2.sub_group_id = sg2.id
  WHERE (p2.template_filter IS NULL OR p2.template_filter = 'new_car_pdi')
  GROUP BY sg2.module_id
  HAVING pdi_sum > 0
) sums ON sg.module_id = sums.module_id
SET p.weightage_pdi = ROUND(p.weightage * 100.0 / sums.pdi_sum, 2)
WHERE (p.template_filter IS NULL OR p.template_filter = 'new_car_pdi');

-- ============================================================================
-- Step 3: Fix rounding drift — add residual to the heaviest param per module
--
-- ROUND() causes totals to land slightly off 100.00 (e.g. 99.99 or 100.01).
-- This step finds the heaviest PDI param per module and adds the difference.
-- ============================================================================

UPDATE inspection_parameters p
JOIN inspection_sub_groups sg ON p.sub_group_id = sg.id
JOIN (
  -- Compute residual = 100.00 - SUM(weightage_pdi) per module
  SELECT sg2.module_id,
         ROUND(100.00 - SUM(p2.weightage_pdi), 2) AS residual
  FROM inspection_parameters p2
  JOIN inspection_sub_groups sg2 ON p2.sub_group_id = sg2.id
  WHERE (p2.template_filter IS NULL OR p2.template_filter = 'new_car_pdi')
    AND p2.weightage_pdi IS NOT NULL
  GROUP BY sg2.module_id
  HAVING ABS(ROUND(100.00 - SUM(p2.weightage_pdi), 2)) > 0
) residuals ON sg.module_id = residuals.module_id
JOIN (
  -- Find the heaviest PDI param per module (gets the adjustment)
  SELECT sg3.module_id, MIN(p3.id) AS param_id
  FROM inspection_parameters p3
  JOIN inspection_sub_groups sg3 ON p3.sub_group_id = sg3.id
  WHERE (p3.template_filter IS NULL OR p3.template_filter = 'new_car_pdi')
    AND p3.weightage_pdi IS NOT NULL
    AND p3.weightage_pdi = (
      SELECT MAX(p4.weightage_pdi)
      FROM inspection_parameters p4
      JOIN inspection_sub_groups sg4 ON p4.sub_group_id = sg4.id
      WHERE sg4.module_id = sg3.module_id
        AND (p4.template_filter IS NULL OR p4.template_filter = 'new_car_pdi')
        AND p4.weightage_pdi IS NOT NULL
    )
  GROUP BY sg3.module_id
) heaviest ON sg.module_id = heaviest.module_id AND p.id = heaviest.param_id
SET p.weightage_pdi = p.weightage_pdi + residuals.residual;

-- ============================================================================
-- Step 4: Verify — each module's PDI weight total should be exactly 100.00%
-- ============================================================================

SELECT
  m.id        AS module_id,
  m.name      AS module_name,
  COUNT(p.id) AS pdi_param_count,
  SUM(p.weightage_pdi) AS pdi_total
FROM inspection_parameters p
JOIN inspection_sub_groups sg ON p.sub_group_id = sg.id
JOIN inspection_modules m ON sg.module_id = m.id
WHERE (p.template_filter IS NULL OR p.template_filter = 'new_car_pdi')
  AND p.weightage_pdi IS NOT NULL
GROUP BY m.id, m.name
ORDER BY m.id;

-- Expected: pdi_total = 100.00 for every row

-- ============================================================================
-- DONE.
-- - Used Car scoring:  always uses `weightage`
-- - PDI scoring:       uses `weightage_pdi` when set, falls back to `weightage`
-- - Edit dialog in admin panel allows per-template weight editing
-- ============================================================================
