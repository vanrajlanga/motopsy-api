/**
 * Kendo DataSource Helper
 * Provides server-side filtering, sorting, and paging similar to KendoNET.DynamicLinq
 */

const { Op } = require('sequelize');

/**
 * Apply Kendo DataSource request to Sequelize query
 * @param {Model} model - Sequelize model
 * @param {Object} request - DataSourceRequest { take, skip, sort, filter }
 * @param {Object} options - Additional options (baseWhere, attributes, include, transform)
 * @returns {Object} DataSourceResult { data, total }
 */
async function toDataSourceResult(model, request, options = {}) {
  const { take, skip = 0, sort, filter } = request;
  const { baseWhere = {}, attributes, include, transform, order: defaultOrder } = options;

  // Build where clause
  let whereClause = { ...baseWhere };

  if (filter) {
    const filterWhere = buildFilterWhere(filter);
    whereClause = { ...whereClause, ...filterWhere };
  }

  // Build order clause
  let orderClause = defaultOrder || [];
  if (sort && sort.length > 0) {
    orderClause = sort.map(s => {
      const field = s.field || s.Field;
      const dir = (s.dir || s.Dir || 'asc').toUpperCase();
      return [field, dir];
    });
  }

  // Get total count
  const total = await model.count({ where: whereClause });

  // Build query options
  const queryOptions = {
    where: whereClause,
    order: orderClause,
    offset: skip
  };

  // Only apply limit if take is provided and > 0 (take: 0 means "return all" in Kendo)
  if (take && take > 0) {
    queryOptions.limit = take;
  }

  if (attributes) {
    queryOptions.attributes = attributes;
  }

  if (include) {
    queryOptions.include = include;
  }

  // Get data
  let data = await model.findAll(queryOptions);

  // Transform data if needed (supports async transforms)
  if (transform) {
    data = await Promise.all(data.map(transform));
  }

  return {
    data,
    total
  };
}

/**
 * Build Sequelize where clause from Kendo filter
 * @param {Object} filter - Kendo filter object
 * @returns {Object} Sequelize where clause
 */
function buildFilterWhere(filter) {
  if (!filter) return {};

  const where = {};

  // Handle composite filters (logic: 'and' | 'or', filters: [])
  if (filter.logic && filter.filters) {
    const logic = filter.logic.toLowerCase();
    const conditions = filter.filters.map(f => buildFilterWhere(f));

    if (logic === 'or') {
      return { [Op.or]: conditions };
    } else {
      return { [Op.and]: conditions };
    }
  }

  // Handle simple filter
  if (filter.field && filter.operator) {
    const field = filter.field;
    const value = filter.value;
    const operator = filter.operator.toLowerCase();

    switch (operator) {
      case 'eq':
      case 'equals':
        where[field] = value;
        break;
      case 'neq':
      case 'notequals':
        where[field] = { [Op.ne]: value };
        break;
      case 'contains':
        where[field] = { [Op.like]: `%${value}%` };
        break;
      case 'doesnotcontain':
        where[field] = { [Op.notLike]: `%${value}%` };
        break;
      case 'startswith':
        where[field] = { [Op.like]: `${value}%` };
        break;
      case 'endswith':
        where[field] = { [Op.like]: `%${value}` };
        break;
      case 'isnull':
        where[field] = { [Op.is]: null };
        break;
      case 'isnotnull':
        where[field] = { [Op.not]: null };
        break;
      case 'isempty':
        where[field] = '';
        break;
      case 'isnotempty':
        where[field] = { [Op.ne]: '' };
        break;
      case 'gt':
        where[field] = { [Op.gt]: value };
        break;
      case 'gte':
        where[field] = { [Op.gte]: value };
        break;
      case 'lt':
        where[field] = { [Op.lt]: value };
        break;
      case 'lte':
        where[field] = { [Op.lte]: value };
        break;
      default:
        where[field] = value;
    }
  }

  return where;
}

module.exports = {
  toDataSourceResult,
  buildFilterWhere
};
