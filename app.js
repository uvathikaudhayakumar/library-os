$(function(){
  $('[data-table-search]').on('input',function(){
    const target=$(this).data('table-search'), q=$(this).val().toLowerCase();
    $(target+' tbody tr').each(function(){ $(this).toggle($(this).text().toLowerCase().includes(q)); });
  });
  $('.delete-form').on('submit',function(e){e.preventDefault();const form=this;Swal.fire({title:'Delete this book?',text:'This action cannot be undone.',icon:'warning',showCancelButton:true,confirmButtonText:'Delete',confirmButtonColor:'#d33'}).then(r=>{if(r.isConfirmed)form.submit();});});
  $('.return-form').on('submit',function(e){e.preventDefault();const form=this;Swal.fire({title:'Confirm book return?',text:'The book inventory will be updated and any overdue fine will be calculated.',icon:'question',showCancelButton:true,confirmButtonText:'Confirm return'}).then(r=>{if(r.isConfirmed)form.submit();});});
  $('.payment-form').on('submit',function(e){if(!$(this).find('[name=reference]').val().trim()){e.preventDefault();Swal.fire('Payment reference required','Enter a receipt or reference before confirming payment.','info');}});
  const socket=io();
  socket.on('admin:activity',()=>{if(location.pathname.startsWith('/admin')){const pill=document.querySelector('.live-pill');if(pill){pill.classList.add('live-pulse');}}});
  socket.on('alerts:updated',()=>{if(location.pathname==='/admin')location.reload();});
  socket.on('student:notification',()=>{if(location.pathname.startsWith('/student'))location.reload();});
  const canvas=document.getElementById('loanChart');
  if(canvas){
    fetch('/admin/api/analytics').then(r=>r.json()).then(data=>{
      new Chart(canvas,{type:'line',data:{labels:data.byMonth.map(x=>x._id),datasets:[{label:'Books issued',data:data.byMonth.map(x=>x.count),borderColor:'#6259e8',backgroundColor:'rgba(98,89,232,.10)',fill:true,tension:.35}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
    }).catch(()=>{});
  }
});
