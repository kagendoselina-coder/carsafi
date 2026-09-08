let currentUser = null;
let services = [];

const money = value => `KES ${Number(value).toLocaleString()}`;
const dateTime = value => new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const isToday = item => new Date(item.datetime).toDateString() === new Date().toDateString();
const app = document.querySelector('#app-content');
const pageTitle = document.querySelector('#page-title');
const roleLabel = role => role === 'administrator' ? 'Administrator' : 'User';
const userLabel = service => service.createdByName || service.createdBy || 'Unknown user';
const canSeeReports = () => currentUser?.role === 'administrator';

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
}

async function loadServices() {
  const result = await apiRequest('/api/services');
  services = result.services || [];
  if (currentUser) {
    render('overview');
  }
}

function updateIdentity(){
  if(!currentUser) return;
  document.querySelector('#sidebar-avatar').textContent = currentUser.initials;
  document.querySelector('#top-avatar').textContent = currentUser.initials;
  document.querySelector('#sidebar-name').textContent = currentUser.name;
  document.querySelector('#sidebar-role').textContent = roleLabel(currentUser.role);
}

function serviceRows(list) {
  if(!list.length) return '<div class="empty-state">No service entries found.</div>';
  return `<div class="table-scroll"><table class="service-table"><thead><tr><th>Vehicle</th><th>Wash type</th><th>Attendant</th><th>Logged by</th><th>Time</th><th>Amount</th><th>Payment</th><th></th></tr></thead><tbody>${list.map((service,index) => `<tr><td><span class="plate">${service.plate}</span><span class="customer-meta">${service.customer} · ${service.vehicle}</span></td><td>${service.wash}</td><td>${service.attendant}</td><td><span class="logger">${userLabel(service)}</span><span class="customer-meta">${service.createdByRole === 'administrator' ? 'Administrator' : 'User'}</span></td><td class="muted">${dateTime(service.datetime)}</td><td class="amount">${money(service.amount)}</td><td><span class="status ${service.status}">${service.status === 'partial' ? 'Partial' : service.status}</span></td><td><button class="receipt-button" data-receipt-index="${index}" title="Download receipt">⇩</button></td></tr>`).join('')}</tbody></table></div>`;
}

function downloadReceipt(service){
  const receipt = `CARSAFI VEHICLE SERVICE DESK\n\nReceipt\nVehicle: ${service.plate}\nCustomer: ${service.customer}\nVehicle type: ${service.vehicle}\nService: ${service.wash}\nAttendant: ${service.attendant}\nLogged by: ${userLabel(service)}\nDate: ${dateTime(service.datetime)}\nAmount: ${money(service.amount)}\nPayment: ${service.status}\n${service.notes ? `Notes: ${service.notes}\n` : ''}`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([receipt], {type:'text/plain'}));
  link.download = `carsafi-receipt-${service.plate.replace(/\s+/g,'-')}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function overview(){
  const current = services.filter(isToday);
  const collection = current.filter(service => service.status === 'paid').reduce((sum, service) => sum + Number(service.amount), 0);
  const debt = services.filter(service => service.status !== 'paid').reduce((sum, service) => sum + Number(service.amount), 0);
  return `<div class="page-heading"><div><p class="eyebrow">Today · ${roleLabel(currentUser.role)}</p><h1>Good morning, ${currentUser.name.split(' ')[0]}</h1><p>Here is how Carsafi is doing today.</p></div><button class="button primary" data-open-modal>＋ Log a service</button></div><div class="stat-grid"><div class="stat-card"><div class="stat-top"><span>Today's services</span><span class="stat-icon">✦</span></div><div class="stat-value">${current.length}</div><div class="stat-meta">Live data synced across devices</div></div><div class="stat-card"><div class="stat-top"><span>Today's collection</span><span class="stat-icon">◌</span></div><div class="stat-value">${money(collection)}</div><div class="stat-meta">Live across all connected devices</div></div><div class="stat-card"><div class="stat-top"><span>Outstanding debt</span><span class="stat-icon">◒</span></div><div class="stat-value">${money(debt)}</div><div class="stat-meta negative">${services.filter(service => service.status !== 'paid').length} open payment records</div></div></div><div class="panel"><div class="panel-header"><div><h2 class="panel-title">Latest service entries</h2><p class="panel-subtitle">Recently logged by the team</p></div></div>${serviceRows(services.slice(0,3))}</div>`;
}

function servicesView(){return `<div class="page-heading"><div><p class="eyebrow">Operations · ${roleLabel(currentUser.role)}</p><h1>Service log</h1><p>Every vehicle visit, wash and payment in one place.</p></div><button class="button primary" data-open-modal>＋ Log a service</button></div><div class="filter-row"><button class="filter active">All services</button><button class="filter">Paid</button><button class="filter">Unpaid</button><button class="filter">Today</button></div><div class="panel table-panel" style="margin-top:0">${serviceRows(services)}</div>`;}

function customersView(){
  const customers = [...new Map(services.map(service => [service.customer, service])).values()];
  return `<div class="page-heading"><div><p class="eyebrow">Relationships</p><h1>Customers</h1><p>A clear history of every customer and their vehicles.</p></div><button class="button primary" data-open-modal>＋ Log a service</button></div><div class="panel"><div class="customer-row header"><div>Customer</div><div>Vehicles</div><div>Visits</div><div>Last service</div></div>${customers.map(customer => {const visits = services.filter(service => service.customer === customer.customer);return `<div class="customer-row"><div><span class="customer-name">${customer.customer}</span><span class="customer-meta">${customer.plate} · ${customer.vehicle}</span></div><div>${new Set(visits.map(visit => visit.plate)).size} vehicle</div><div>${visits.length} visits</div><div class="muted">${dateTime(visits[0].datetime)}</div></div>`;}).join('')}</div>`;
}

function reportsView(){const collection = services.filter(service => service.status === 'paid').reduce((sum, service) => sum + Number(service.amount), 0);return `<div class="page-heading"><div><p class="eyebrow">Insights · Administrator only</p><h1>Reports</h1><p>Understand collection, payment health and service demand.</p></div><button class="button ghost">⇩ Export report</button></div><div class="report-grid"><div class="report-card"><p class="eyebrow">This week</p><div class="big">${money(collection+12400)}</div><p>Collected revenue</p></div><div class="report-card"><p class="eyebrow">This week</p><div class="big">${services.length+69}</div><p>Total services completed</p></div><div class="report-card"><p class="eyebrow">Payment health</p><div class="big">92%</div><p>Invoices paid on time</p></div></div>`;}

function bindViewEvents(){document.querySelectorAll('[data-open-modal]').forEach(button => button.addEventListener('click', openModal));document.querySelectorAll('[data-receipt-index]').forEach(button => button.addEventListener('click', () => downloadReceipt(services[Number(button.dataset.receiptIndex)])));document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));button.classList.add('active');}));}

function render(view='overview'){
  if(view === 'reports' && !canSeeReports()) view = 'overview';
  pageTitle.textContent = view[0].toUpperCase() + view.slice(1);
  app.innerHTML = view === 'overview' ? overview() : view === 'services' ? servicesView() : view === 'customers' ? customersView() : reportsView();
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  document.querySelector('[data-view="reports"]').hidden = !canSeeReports();
  updateIdentity();
  bindViewEvents();
}

function openModal(){const modal = document.querySelector('#service-modal');modal.hidden = false;modal.querySelector('[name=datetime]').value = new Date().toISOString().slice(0,16);modal.querySelector('[name=amount]').value = modal.querySelector('[name=wash] option:checked').dataset.price;}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => render(button.dataset.view)));
document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', () => document.querySelector('#service-modal').hidden = true));

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  try {
    const result = await apiRequest('/api/login', { method: 'POST', body: JSON.stringify({ email: data.email, password: data.password }) });
    currentUser = result.user;
    localStorage.setItem('carsafi-session', JSON.stringify(currentUser));
    document.querySelector('#login-error').hidden = true;
    document.querySelector('#login-screen').hidden = true;
    await loadServices();
  } catch (error) {
    document.querySelector('#login-error').textContent = error.message;
    document.querySelector('#login-error').hidden = false;
  }
});

document.querySelector('#logout-button').addEventListener('click', () => {
  localStorage.removeItem('carsafi-session');
  currentUser = null;
  document.querySelector('#login-screen').hidden = false;
});

document.querySelector('#service-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  try {
    await apiRequest('/api/services', {
      method: 'POST',
      body: JSON.stringify({
        plate: data.plate,
        customer: data.customer,
        vehicle: data.vehicle,
        wash: data.wash,
        attendant: data.attendant,
        amount: Number(data.amount),
        status: data.status,
        datetime: data.datetime,
        notes: data.notes || '',
        createdBy: currentUser.id
      })
    });
    event.target.reset();
    document.querySelector('#service-modal').hidden = true;
    await loadServices();
    render('services');
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector('[name=wash]').addEventListener('change', event => {document.querySelector('[name=amount]').value = event.target.selectedOptions[0].dataset.price;});

const savedSession = localStorage.getItem('carsafi-session');
if (savedSession) {
  try {
    currentUser = JSON.parse(savedSession);
    document.querySelector('#login-screen').hidden = true;
    loadServices();
  } catch (error) {
    localStorage.removeItem('carsafi-session');
  }
}
