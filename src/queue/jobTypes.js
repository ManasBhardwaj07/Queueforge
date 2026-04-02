const JOB_TYPES = Object.freeze({
  EMAIL: 'email',
  REPORT: 'report',
});

const JOB_TYPE_LIST = Object.freeze(Object.values(JOB_TYPES));

module.exports = {
  JOB_TYPES,
  JOB_TYPE_LIST,
};
