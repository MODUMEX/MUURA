update public.profiles
set rol = 'admin', activo = true, nombre = case when nombre = '' then 'Dayanna Lizano' else nombre end
where lower(correo) = lower('dlizano@modumex.com');

select correo, nombre, rol, activo from public.profiles order by creado;
