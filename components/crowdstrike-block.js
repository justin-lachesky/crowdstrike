polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  timezone: Ember.computed('Intl', function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),
  detectionProperties: [
    'status',
    'max_confidence',
    'max_severity',
    'first_behavior',
    'last_behavior'
  ],
  activeTab: 'crowdstrike',
  compactDeviceProperties: [
    'platform_name',
    'os_version',
    'product_type_desc',
    'system_manufacturer',
    'hostname',
    'machine_domain'
  ],
  modalOpen: false,
  containOrUncontainMessages: {},
  containOrUncontainErrorMessages: {},
  containOrUncontainIsRunning: {},
  compactBehaviorProperties: [
    'scenario',
    'objective',
    'filename',
    'tactic',
    'technique',
    'severity',
    'confidence'
  ],
  containmentStatus: '',
  isRunning: false,
  modalDevice: {},
  init() {
    this.set(
      'activeTab',
      this.get('details.events.detections.length')
        ? 'crowdstrike'
        : this.get('block.userOptions.searchIoc') &&
          this.get('details.iocs.indicators.length')
        ? 'crowdstrikeIoc'
        : 'hosts'
    );

    this._super(...arguments);
  },
  actions: {
    changeTab: function (tabName) {
      this.set('activeTab', tabName);
    },
    retryLookup: function () {
      this.set('running', true);
      this.set('errorMessage', '');

      const payload = {
        action: 'RETRY_LOOKUP',
        entity: this.get('block.entity')
      };

      this.sendIntegrationMessage(payload)
        .then((result) => {
          if (result.data.summary) this.set('summary', result.summary);
          this.set('block.data', result.data);
        })
        .catch((err) => {
          this.set('details.errorMessage', JSON.stringify(err, null, 4));
        })
        .finally(() => {
          this.set('running', false);
        });
    },
    showAllDeviceInfo: function (detectionIndex) {
      this.toggleProperty(
        'details.events.detections.' + detectionIndex + '.__showAllDeviceInfo'
      );
    },
    showAllBehaviorInfo: function (detectionIndex) {
      this.toggleProperty(
        'details.events.detections.' + detectionIndex + '.__showAllBehaviorInfo'
      );
    },
    toggleShowModal: function (device, index) {
      this.toggleProperty('modalOpen');

      if (device) this.set('modalDevice', { device, index });
    },
    confirmContainmentOrLiftContainment: function () {
      const outerThis = this;

      const { device, index } = this.get('modalDevice');

      this.setMessages(index, 'getAndUpdateDeviceState', '');
      this.setErrorMessages(index, 'getAndUpdateDeviceState', '');
      this.setIsRunning(index, 'getAndUpdateDeviceState', true);
      this.set('modalOpen', false);

      this.sendIntegrationMessage({
        action: 'containOrUncontain',
        data: { id: device.device_id, status: device.status }
      })
        .then(({ updatedDeviceState }) => {
          this.set('details.hosts.devices.' + index + '.status', updatedDeviceState);
          outerThis.setMessages(index, 'getAndUpdateDeviceState', 'Success!');
        })
        .catch((err) => {
          outerThis.setErrorMessages(index, 'getAndUpdateDeviceState', `Failed ${err}`);
        })
        .finally(() => {
          this.setIsRunning(index, 'getAndUpdateDeviceState', false);
          outerThis.get('block').notifyPropertyChange('data');

          setTimeout(() => {
            outerThis.setMessages(index, 'getAndUpdateDeviceState', '');
            outerThis.setErrorMessages(index, 'getAndUpdateDeviceState', '');
            outerThis.get('block').notifyPropertyChange('data');
          }, 5000);
        });
    },
    getAndUpdateDeviceState: function (device, index) {
      this.setIsRunning(index, 'getAndUpdateDeviceState', true);
      this.setMessages(index, 'getAndUpdateDeviceState', '');
      this.setErrorMessages(index, 'getAndUpdateDeviceState', '');

      this.sendIntegrationMessage({
        action: 'getAndUpdateDeviceState',
        data: { id: device.device_id }
      })
        .then(({ deviceStatus }) => {
          this.set('details.hosts.devices.' + index + '.status', deviceStatus);
          if (!['normal', 'contained'].includes(deviceStatus)) {
            this.setMessages(index, 'getAndUpdateDeviceState', 'Still Pending...');
            let element = document.getElementById(`device-${index}`);
            this.flashElement(element);
          }
        })
        .catch((err) => {
          this.setErrorMessages(index, 'getAndUpdateDeviceState', `${err}`);
        })
        .finally(() => {
          this.setIsRunning(index, 'getAndUpdateDeviceState', false);
          this.get('block').notifyPropertyChange('data');
          setTimeout(() => {
            this.setMessages(index, 'getAndUpdateDeviceState', '');
            this.setErrorMessages(index, 'getAndUpdateDeviceState', '');
            this.get('block').notifyPropertyChange('data');
          }, 5000);
        });
    }
  },
  setMessages: function (index, prefix, message) {
    console.log(index, prefix, message);
    this.set(
      `${prefix}Messages`,
      Object.assign({}, this.get(`${prefix}Messages`), { [index]: message })
    );
  },
  setErrorMessages: function (index, prefix, message) {
    this.set(
      `${prefix}ErrorMessages`,
      Object.assign({}, this.get(`${prefix}ErrorMessages`), {
        [index]: message
      })
    );
  },
  flashElement: function (element, flashCount = 3, flashTime = 280) {
    if (!flashCount) return;
    element.classList.add('highlight');
    setTimeout(() => {
      element.classList.remove('highlight');
      setTimeout(() => this.flashElement(element, flashCount - 1), flashTime);
    }, flashTime);
  },
  toggleModal: function () {
    if (!this.get('modalOpen')) {
    }
  },
  setIsRunning: function (index, prefix, value) {
    this.set(
      `${prefix}IsRunning`,
      Object.assign({}, this.get(`${prefix}IsRunning`), { [index]: value })
    );
  }
});
