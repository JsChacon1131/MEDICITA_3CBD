const service = require('../services/finance.service');
const asyncHandler = require('../utils/async-handler');

module.exports = {
  report: asyncHandler(async (req, res) => res.json(await service.report(req.query))),
  today: asyncHandler(async (req, res) => res.json(await service.listToday()))
};
