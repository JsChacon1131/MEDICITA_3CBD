const appointmentService = require('../services/appointment.service');
const asyncHandler = require('../utils/async-handler');
const { createCrudController, resolvePatientFilter } = require('./crud.controller');

module.exports = {
  ...createCrudController(appointmentService),
  edit: asyncHandler(async (req, res) => {
    res.json(await appointmentService.edit(req.params.id, req.body, req.user));
  }),
  list: asyncHandler(async (req, res) => {
    res.json(await appointmentService.list(resolvePatientFilter(req), req.query.date));
  }),
  availability: asyncHandler(async (req, res) => {
    res.json(await appointmentService.availability(req.params.id, req.query.date));
  })
};
